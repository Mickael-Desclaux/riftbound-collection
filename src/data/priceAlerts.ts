/** Les Alertes de prix des souhaits, après une synchronisation (spec § 3 point 10). */
import { eq } from 'drizzle-orm';

import { toIsoDate } from '@/domain/dates';
import { priceAlerts, type PriceAlert, type PriceAlertCandidate } from '@/domain/priceAlert';
import { referenceFinish } from '@/domain/priceDisplay';
import { printingFinishKey } from '@/domain/priceRecords';

import type { AppDatabase } from './database';
import { readWishlistPriceHistory } from './prices';
import { card, printing, wishlistEntry } from './schema';
import { getSetting } from './settings';

/**
 * Les souhaits qui ont baissé du seuil choisi dans la Source de prix choisie,
 * d'après leur Finition de référence. Les Versions inconnues, sans prix, ne
 * sont pas vérifiées. Rien n'est enregistré : voir `recordPriceAlerts`.
 */
export function findPriceAlerts(db: AppDatabase, now: Date): PriceAlert[] {
  const source = getSetting(db, 'priceSource');
  const history = readWishlistPriceHistory(db, source);
  const wishes = db
    .select({
      printingCode: wishlistEntry.printingCode,
      addedAt: wishlistEntry.addedAt,
      lastAlertPrice: wishlistEntry.lastAlertPrice,
      lastAlertSource: wishlistEntry.lastAlertSource,
      lastAlertAt: wishlistEntry.lastAlertAt,
      finishes: printing.finishes,
      cardName: card.name,
    })
    .from(wishlistEntry)
    .innerJoin(printing, eq(printing.printingCode, wishlistEntry.printingCode))
    .innerJoin(card, eq(card.oracleId, printing.cardOracleId))
    .all();

  const candidates = wishes.map(
    ({ lastAlertPrice, lastAlertSource, lastAlertAt, finishes, ...wish }): PriceAlertCandidate => {
      const finish = referenceFinish(finishes);
      const records =
        finish && history.get(printingFinishKey({ printingCode: wish.printingCode, finish }));
      const lastAlert =
        lastAlertPrice !== null && lastAlertSource !== null && lastAlertAt !== null
          ? { price: lastAlertPrice, source: lastAlertSource, at: lastAlertAt }
          : null;
      return { ...wish, lastAlert, records: records || [] };
    },
  );
  return priceAlerts(candidates, {
    source,
    threshold: getSetting(db, 'priceAlertThreshold'),
    today: toIsoDate(now),
  });
}

/**
 * Retient les alertes annoncées (prix, source, date) : chaque Version ne
 * réalertera que si son prix rebaisse du seuil.
 */
export function recordPriceAlerts(db: AppDatabase, alerts: readonly PriceAlert[], now: Date): void {
  const at = now.toISOString();
  db.transaction((tx) => {
    for (const { printingCode, source, price } of alerts) {
      tx.update(wishlistEntry)
        .set({ lastAlertPrice: price, lastAlertSource: source, lastAlertAt: at })
        .where(eq(wishlistEntry.printingCode, printingCode))
        .run();
    }
  });
}
