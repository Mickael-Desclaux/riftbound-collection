/** Prix du jour (Données de référence) et historique des Relevés de prix (Données précieuses). */
import { count, eq, isNotNull, max, min, sql } from 'drizzle-orm';

import { toIsoDate, type IsoDate, type IsoDateTime } from '@/domain/dates';

import type { Finish, PriceSource } from '@/domain/price';
import type { FinishPrices } from '@/domain/priceDisplay';
import {
  priceKey,
  type CurrentPrice,
  type LastRecord,
  type PriceRecord,
} from '@/domain/priceRecords';
import type { PrintingCode } from '@/domain/printingCode';

import type { AppDatabase } from './database';
import { chunks } from './chunks';
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
    // Un produit répété dans le flux ne doit pas bloquer toute la mise à jour.
    for (const rows of chunks(prices)) {
      tx.insert(currentPrice).values(rows).onConflictDoNothing().run();
    }
    for (const rows of chunks(records)) {
      tx.insert(priceRecord).values(rows).onConflictDoNothing().run();
    }
  });
}

/** La date (UTC) du plus ancien Relevé de prix, toutes sources confondues. */
export function earliestPriceRecordDate(db: AppDatabase): IsoDate | undefined {
  const first = db
    .select({ first: min(priceRecord.recordedAt) })
    .from(priceRecord)
    .get()?.first;
  return first ? toIsoDate(new Date(first)) : undefined;
}

/** Prix du jour d'une source, par Code de version puis par Finition. */
export function readCurrentPrices(db: AppDatabase, source: PriceSource): Map<string, FinishPrices> {
  const rows = db
    .select({
      printingCode: currentPrice.printingCode,
      finish: currentPrice.finish,
      value: currentPrice.referenceMetricValue,
      currency: currentPrice.currency,
    })
    .from(currentPrice)
    .where(eq(currentPrice.source, source))
    .all();
  const prices = new Map<string, FinishPrices>();
  for (const { printingCode, finish, value, currency } of rows) {
    prices.set(printingCode, { ...prices.get(printingCode), [finish]: { value, currency } });
  }
  return prices;
}

/** La date de publication la plus récente des prix du jour d'une source. */
export function latestPublishedAt(db: AppDatabase, source: PriceSource): IsoDateTime | undefined {
  return (
    db
      .select({ latest: max(currentPrice.publishedAt) })
      .from(currentPrice)
      .where(eq(currentPrice.source, source))
      .get()?.latest ?? undefined
  );
}

/** Une Version du Catalogue, avec les Finitions dans lesquelles elle existe. */
export type PricedPrinting = { printingCode: PrintingCode; finishes: Finish[] };

/** Les Versions de chaque produit Cardmarket du Catalogue. */
export function printingsByCardmarketId(db: AppDatabase): Map<number, PricedPrinting[]> {
  const rows = db
    .select({
      id: printing.cardmarketProductId,
      printingCode: printing.printingCode,
      finishes: printing.finishes,
    })
    .from(printing)
    .where(isNotNull(printing.cardmarketProductId))
    .all();
  const byId = new Map<number, PricedPrinting[]>();
  for (const { id, ...priced } of rows) {
    byId.set(id as number, [...(byId.get(id as number) ?? []), priced]);
  }
  return byId;
}

/**
 * Remplace la correspondance `tcgId` → `idProduct` Cardmarket de toutes les
 * Versions : une Version sans correspondance n'a plus de produit Cardmarket.
 * Seules les Versions qui changent sont réécrites.
 */
export function applyCardmarketLinks(db: AppDatabase, links: Map<number, number>): void {
  db.transaction((tx) => {
    const rows = tx
      .select({
        printingCode: printing.printingCode,
        tcgId: printing.tcgId,
        current: printing.cardmarketProductId,
      })
      .from(printing)
      .all();
    for (const { printingCode, tcgId, current } of rows) {
      const next = tcgId === null ? null : (links.get(tcgId) ?? null);
      if (next === current) continue;
      tx.update(printing)
        .set({ cardmarketProductId: next })
        .where(eq(printing.printingCode, printingCode))
        .run();
    }
  });
}
