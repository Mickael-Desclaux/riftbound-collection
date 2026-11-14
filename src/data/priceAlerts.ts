/** Vérification des Alertes de prix après une synchronisation (spec § 3 point 10). */
import { eq } from 'drizzle-orm';

import { toIsoDate } from '@/domain/dates';
import { priceAlerts, type PriceAlertCandidate } from '@/domain/priceAlert';
import { referenceFinish } from '@/domain/priceDisplay';
import { printingFinishKey } from '@/domain/priceRecords';
import type { PrintingCode } from '@/domain/printingCode';

import type { AppDatabase } from './database';
import { readWishlistPriceHistory } from './prices';
import { card, printing, wishlistEntry } from './schema';
import { getSetting } from './settings';

/** Une Alerte de prix émise, à annoncer : la Version, sa Carte et sa baisse en %. */
export type EmittedPriceAlert = { printingCode: PrintingCode; cardName: string; change: number };

/**
 * Les souhaits qui ont baissé du seuil choisi dans la Source de prix choisie,
 * d'après leur Finition de référence. Chaque alerte est retenue (prix, source,
 * date) : la Version ne réalertera que si son prix rebaisse du seuil. Les
 * Versions inconnues, sans prix, ne sont pas vérifiées.
 */
export function checkPriceAlerts(db: AppDatabase, now: Date): EmittedPriceAlert[] {
  const source = getSetting(db, 'priceSource');
  const threshold = getSetting(db, 'priceAlertThreshold');
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

  const candidates: PriceAlertCandidate[] = wishes.map((wish) => {
    const finish = referenceFinish(wish.finishes);
    const records = finish
      ? history.get(printingFinishKey({ printingCode: wish.printingCode, finish }))
      : undefined;
    return {
      printingCode: wish.printingCode,
      addedAt: wish.addedAt,
      lastAlert:
        wish.lastAlertPrice !== null && wish.lastAlertSource !== null && wish.lastAlertAt !== null
          ? { price: wish.lastAlertPrice, source: wish.lastAlertSource, at: wish.lastAlertAt }
          : null,
      records: records ?? [],
    };
  });
  const alerts = priceAlerts(candidates, { source, threshold, today: toIsoDate(now) });
  if (alerts.length === 0) return [];

  const at = now.toISOString();
  db.transaction((tx) => {
    for (const { printingCode, price } of alerts) {
      tx.update(wishlistEntry)
        .set({ lastAlertPrice: price, lastAlertSource: source, lastAlertAt: at })
        .where(eq(wishlistEntry.printingCode, printingCode))
        .run();
    }
  });
  const names = new Map(wishes.map((wish) => [wish.printingCode, wish.cardName]));
  return alerts.map(({ printingCode, change }) => ({
    printingCode,
    cardName: names.get(printingCode) ?? printingCode,
    change,
  }));
}
