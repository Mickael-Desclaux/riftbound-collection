/**
 * Synchronisation des prix TCGplayer et Cardmarket (spec § 3, § 5) : chaque
 * source est retéléchargée si son dernier succès date de plus de 6 h (ou sur
 * demande), sauf si le fichier n'a pas changé (Last-Modified). Chaque
 * changement de l'Indicateur de référence ajoute un Relevé de prix.
 */
import { hasCatalog } from '@/data/catalog';
import type { AppDatabase } from '@/data/database';
import {
  currentPriceCount,
  lastPriceRecords,
  printingCodesByTcgId,
  printingsByCardmarketId,
  savePrices,
} from '@/data/prices';
import type { SourceId } from '@/data/schema';
import { getSourceState, recordSourceSuccess } from '@/data/sourceState';
import { REFERENCE_METRIC, type PriceSource } from '@/domain/price';
import { newPriceRecords, type CurrentPrice } from '@/domain/priceRecords';
import {
  fetchCardmarketPriceGuide,
  type CardmarketPriceGuide,
} from '@/sources/cardmarket/priceGuide';
import type { ConditionalResult } from '@/sources/http';
import { fetchTcgplayerPrices, type TcgplayerPrice } from '@/sources/rifthunt/prices';

import type { SyncDeps } from './catalog';
import { failuresRecorded, hasPendingError, HOUR, isOlderThan } from './schedule';

const PRICES_MAX_AGE = 6 * HOUR;

/** `skipped` : rien à faire ; `unchanged` : fichier inchangé (304) ; `refreshed` : prix enregistrés. */
export type PriceSyncOutcome = 'skipped' | 'unchanged' | 'refreshed';

type PriceOptions = {
  /** `refresh` : l'utilisateur demande une mise à jour, sans attendre les 6 h. */
  refresh?: boolean;
};

/** Ce qui distingue une source de prix des autres. */
type PriceFeed<T> = {
  source: PriceSource;
  stateId: SourceId;
  download: (
    fetch: SyncDeps['fetch'],
    lastModified: string | null,
  ) => Promise<ConditionalResult<T>>;
  /** Les prix du jour du fichier, rattachés aux Versions du Catalogue. */
  toCurrentPrices: (db: AppDatabase, data: T) => CurrentPrice[];
};

async function syncPriceFeed<T>(
  { db, fetch, now }: SyncDeps,
  { refresh = false }: PriceOptions,
  feed: PriceFeed<T>,
): Promise<PriceSyncOutcome> {
  // Les prix se rattachent aux Versions du Catalogue : sans lui, rien à faire.
  if (!hasCatalog(db)) return 'skipped';
  const at = now();
  const state = getSourceState(db, feed.stateId);
  if (!refresh && !hasPendingError(state) && !isOlderThan(state, PRICES_MAX_AGE, at)) {
    return 'skipped';
  }

  return failuresRecorded(db, feed.stateId, at, async () => {
    // Sans prix enregistrés, on retélécharge tout, même si le fichier n'a pas changé.
    const lastModified =
      currentPriceCount(db, feed.source) > 0 ? (state?.lastModified ?? null) : null;
    const response = await feed.download(fetch, lastModified);
    if (!response.modified) {
      recordSourceSuccess(db, feed.stateId, at.toISOString());
      return 'unchanged';
    }
    const prices = feed.toCurrentPrices(db, response.data);
    savePrices(db, feed.source, prices, newPriceRecords(prices, lastPriceRecords(db, feed.source)));
    recordSourceSuccess(db, feed.stateId, at.toISOString(), {
      lastModified: response.lastModified,
    });
    return 'refreshed';
  });
}

const tcgplayer: PriceFeed<TcgplayerPrice[]> = {
  source: 'tcgplayer',
  stateId: 'rifthunt-prices',
  download: fetchTcgplayerPrices,
  toCurrentPrices: (db, products) => {
    const codes = printingCodesByTcgId(db);
    return products.flatMap((product) => {
      const printingCode = codes.get(product.tcgId);
      if (printingCode === undefined) return [];
      return product.finishes.map(({ finish, metrics }) => ({
        printingCode,
        source: 'tcgplayer' as const,
        finish,
        referenceMetricValue: metrics[REFERENCE_METRIC.tcgplayer] ?? null,
        metrics,
        currency: 'USD' as const,
        publishedAt: product.publishedAt,
      }));
    });
  },
};

const cardmarket: PriceFeed<CardmarketPriceGuide> = {
  source: 'cardmarket',
  stateId: 'cardmarket-prices',
  download: fetchCardmarketPriceGuide,
  toCurrentPrices: (db, { publishedAt, products }) => {
    const printings = printingsByCardmarketId(db);
    return products.flatMap((product) =>
      (printings.get(product.idProduct) ?? []).flatMap(({ printingCode, finishes }) =>
        // Les champs `-foil` selon la Finition réelle de la Version : pour une
        // Version foil seulement, Cardmarket remplit aussi les champs normaux.
        finishes.flatMap((finish) => {
          const metrics = product.finishes[finish];
          if (!metrics || Object.values(metrics).every((value) => value === null)) return [];
          return [
            {
              printingCode,
              source: 'cardmarket' as const,
              finish,
              referenceMetricValue: metrics[REFERENCE_METRIC.cardmarket] ?? null,
              metrics,
              currency: 'EUR' as const,
              publishedAt,
            },
          ];
        }),
      ),
    );
  },
};

export function syncTcgplayerPrices(deps: SyncDeps, options: PriceOptions = {}) {
  return syncPriceFeed(deps, options, tcgplayer);
}

export function syncCardmarketPrices(deps: SyncDeps, options: PriceOptions = {}) {
  return syncPriceFeed(deps, options, cardmarket);
}
