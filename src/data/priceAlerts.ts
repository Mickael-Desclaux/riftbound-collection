/**
 * Les Alertes de prix, après une synchronisation (spec § 3 point 10) : baisse
 * des souhaits, hausse des Versions de la Collection.
 */
import { eq } from 'drizzle-orm';

import { toIsoDate } from '@/domain/dates';
import {
  priceAlerts,
  type PriceAlert,
  type PriceAlertCandidate,
  type PriceAlertDirection,
} from '@/domain/priceAlert';
import { referenceFinish } from '@/domain/priceDisplay';
import { printingFinishKey } from '@/domain/priceRecords';

import type { AppDatabase } from './database';
import { readCollectionPriceHistory, readWishlistPriceHistory } from './prices';
import { card, collectionEntry, printing, wishlistEntry } from './schema';
import { getSetting } from './settings';

/** Où chaque sens lit ses Versions, leurs relevés et son seuil. */
const WATCHED = {
  drop: {
    table: wishlistEntry,
    readHistory: readWishlistPriceHistory,
    threshold: 'priceAlertThreshold',
  },
  rise: {
    table: collectionEntry,
    readHistory: readCollectionPriceHistory,
    threshold: 'priceRiseAlertThreshold',
  },
} as const;

/**
 * Les Versions qui ont changé du seuil choisi, dans le sens `direction` et
 * dans la Source de prix choisie, d'après leur Finition de référence. Les
 * Versions inconnues, sans prix, ne sont pas vérifiées. Rien n'est
 * enregistré : voir `recordPriceAlerts`.
 */
export function findPriceAlerts(
  db: AppDatabase,
  direction: PriceAlertDirection,
  now: Date,
): PriceAlert[] {
  const { table, readHistory, threshold } = WATCHED[direction];
  const source = getSetting(db, 'priceSource');
  const history = readHistory(db, source);
  const watched = db
    .select({
      printingCode: table.printingCode,
      addedAt: table.addedAt,
      lastAlertPrice: table.lastAlertPrice,
      lastAlertSource: table.lastAlertSource,
      lastAlertAt: table.lastAlertAt,
      finishes: printing.finishes,
      cardName: card.name,
    })
    .from(table)
    .innerJoin(printing, eq(printing.printingCode, table.printingCode))
    .innerJoin(card, eq(card.oracleId, printing.cardOracleId))
    .all();

  const candidates = watched.map(
    ({ lastAlertPrice, lastAlertSource, lastAlertAt, finishes, ...entry }): PriceAlertCandidate => {
      const finish = referenceFinish(finishes);
      const records =
        finish && history.get(printingFinishKey({ printingCode: entry.printingCode, finish }));
      const lastAlert =
        lastAlertPrice !== null && lastAlertSource !== null && lastAlertAt !== null
          ? { price: lastAlertPrice, source: lastAlertSource, at: lastAlertAt }
          : null;
      return { ...entry, lastAlert, records: records || [] };
    },
  );
  return priceAlerts(candidates, {
    direction,
    source,
    threshold: getSetting(db, threshold),
    today: toIsoDate(now),
  });
}

/**
 * Retient les alertes annoncées (prix, source, date) : chaque Version ne
 * réalertera que si son prix change à nouveau du seuil.
 */
export function recordPriceAlerts(db: AppDatabase, alerts: readonly PriceAlert[], now: Date): void {
  const at = now.toISOString();
  db.transaction((tx) => {
    for (const { printingCode, direction, source, price } of alerts) {
      const { table } = WATCHED[direction];
      tx.update(table)
        .set({ lastAlertPrice: price, lastAlertSource: source, lastAlertAt: at })
        .where(eq(table.printingCode, printingCode))
        .run();
    }
  });
}
