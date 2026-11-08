/** Prix du jour (Données de référence) et historique des Relevés de prix (Données précieuses). */
import { count, eq, isNotNull, sql } from 'drizzle-orm';

import type { PriceSource } from '@/domain/price';
import {
  priceKey,
  type CurrentPrice,
  type LastRecord,
  type PriceRecord,
} from '@/domain/priceRecords';
import type { PrintingCode } from '@/domain/printingCode';

import type { AppDatabase } from './database';
import { currentPrice, printing, priceRecord } from './schema';

/** Code de version de chaque produit TCGplayer du Catalogue. */
export function printingCodesByTcgId(db: AppDatabase): Map<number, PrintingCode> {
  const rows = db
    .select({ tcgId: printing.tcgId, printingCode: printing.printingCode })
    .from(printing)
    .where(isNotNull(printing.tcgId))
    .all();
  return new Map(rows.map((row) => [row.tcgId as number, row.printingCode]));
}

/** Le dernier relevé de chaque Version × Finition pour une source. */
export function lastPriceRecords(db: AppDatabase, source: PriceSource): Map<string, LastRecord> {
  // Avec max(), SQLite donne les autres colonnes de la ligne qui porte ce maximum.
  const rows = db
    .select({
      printingCode: priceRecord.printingCode,
      source: priceRecord.source,
      finish: priceRecord.finish,
      value: priceRecord.value,
      recordedAt: sql<string>`max(${priceRecord.recordedAt})`,
    })
    .from(priceRecord)
    .where(eq(priceRecord.source, source))
    .groupBy(priceRecord.printingCode, priceRecord.finish)
    .all();
  return new Map(
    rows.map((row) => [priceKey(row), { value: row.value, recordedAt: row.recordedAt }]),
  );
}

/** Combien de prix du jour on a pour une source. */
export function currentPriceCount(db: AppDatabase, source: PriceSource): number {
  return (
    db.select({ n: count() }).from(currentPrice).where(eq(currentPrice.source, source)).get()?.n ??
    0
  );
}

/**
 * Remplace les prix du jour d'une source et ajoute les nouveaux relevés, en une
 * transaction. Un relevé déjà présent (même clé, même date) n'est jamais dupliqué.
 */
export function savePrices(
  db: AppDatabase,
  source: PriceSource,
  prices: CurrentPrice[],
  records: PriceRecord[],
): void {
  db.transaction((tx) => {
    tx.delete(currentPrice).where(eq(currentPrice.source, source)).run();
    for (let i = 0; i < prices.length; i += 100) {
      tx.insert(currentPrice)
        .values(prices.slice(i, i + 100))
        .run();
    }
    for (let i = 0; i < records.length; i += 100) {
      tx.insert(priceRecord)
        .values(records.slice(i, i + 100))
        .onConflictDoNothing()
        .run();
    }
  });
}
