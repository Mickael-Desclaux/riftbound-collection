/**
 * Synchronisation des prix TCGplayer (spec § 3, § 5) : retéléchargés si le
 * dernier succès date de plus de 6 h (ou sur demande), sauf si le fichier n'a
 * pas changé (Last-Modified). Chaque changement de l'Indicateur de référence
 * ajoute un Relevé de prix.
 */
import { hasCatalog } from '@/data/catalog';
import {
  currentPriceCount,
  lastPriceRecords,
  printingCodesByTcgId,
  savePrices,
} from '@/data/prices';
import { getSourceState, recordSourceSuccess } from '@/data/sourceState';
import { REFERENCE_METRIC } from '@/domain/price';
import { newPriceRecords, type CurrentPrice } from '@/domain/priceRecords';
import { fetchTcgplayerPrices } from '@/sources/rifthunt/prices';

import type { SyncDeps } from './catalog';
import { hasPendingError, HOUR, isOlderThan, recorded } from './schedule';

const PRICES_MAX_AGE = 6 * HOUR;

/** `skipped` : rien à faire ; `unchanged` : fichier inchangé (304) ; `refreshed` : prix enregistrés. */
export type PriceSyncOutcome = 'skipped' | 'unchanged' | 'refreshed';

export async function syncTcgplayerPrices(
  { db, fetch, now }: SyncDeps,
  { force = false }: { force?: boolean } = {},
): Promise<PriceSyncOutcome> {
  // Les prix se rattachent aux Versions du Catalogue : sans lui, rien à faire.
  if (!hasCatalog(db)) return 'skipped';
  const at = now();
  const state = getSourceState(db, 'rifthunt-prices');
  if (!force && !hasPendingError(state) && !isOlderThan(state, PRICES_MAX_AGE, at)) {
    return 'skipped';
  }

  return recorded(
    db,
    'rifthunt-prices',
    at,
    async () => {
      // Sans prix enregistrés, on retélécharge tout, même si le fichier n'a pas changé.
      const lastModified =
        currentPriceCount(db, 'tcgplayer') > 0 ? (state?.lastModified ?? null) : null;
      const response = await fetchTcgplayerPrices(fetch, lastModified);
      if (!response.modified) {
        recordSourceSuccess(db, 'rifthunt-prices', at.toISOString());
        return 'unchanged';
      }

      const codes = printingCodesByTcgId(db);
      const prices: CurrentPrice[] = response.data.flatMap((product) => {
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
      savePrices(
        db,
        'tcgplayer',
        prices,
        newPriceRecords(prices, lastPriceRecords(db, 'tcgplayer')),
      );
      recordSourceSuccess(db, 'rifthunt-prices', at.toISOString(), {
        lastModified: response.lastModified,
      });
      return 'refreshed';
    },
    { recordSuccess: false },
  );
}
