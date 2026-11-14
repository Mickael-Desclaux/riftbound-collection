/** Prix du jour (Données de référence) et historique des Relevés de prix (Données précieuses). */
import { and, asc, count, eq, inArray, isNotNull, lt, max, min, sql } from 'drizzle-orm';

import type { OwnedPrintingHistory } from '@/domain/collectionValue';
import { addDays, toIsoDate, type IsoDate, type IsoDateTime } from '@/domain/dates';

import type { Finish, PriceSource } from '@/domain/price';
import type { FinishPrices } from '@/domain/priceDisplay';
import {
  priceKey,
  printingFinishKey,
  type CurrentPrice,
  type LastRecord,
  type PriceRecord,
} from '@/domain/priceRecords';
import type { PrintingCode } from '@/domain/printingCode';

import type { AppDatabase } from './database';
import { chunks } from './chunks';
import { collectionEntry, currentPrice, printing, priceRecord } from './schema';

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
export type PrintingFinishes = { printingCode: PrintingCode; finishes: Finish[] };

/** Les Versions de chaque produit Cardmarket du Catalogue. */
export function printingsByCardmarketId(db: AppDatabase): Map<number, PrintingFinishes[]> {
  const rows = db
    .select({
      id: printing.cardmarketProductId,
      printingCode: printing.printingCode,
      finishes: printing.finishes,
    })
    .from(printing)
    .where(isNotNull(printing.cardmarketProductId))
    .all();
  const byId = new Map<number, PrintingFinishes[]>();
  for (const { id, ...priced } of rows) {
    byId.set(id as number, [...(byId.get(id as number) ?? []), priced]);
  }
  return byId;
}

/** Les Relevés de prix d'une Version, par Source de prix et Finition. */
export type PrintingHistory = Partial<
  Record<PriceSource, Partial<Record<Finish, Pick<PriceRecord, 'recordedAt' | 'value'>[]>>>
>;

/** Tout l'historique d'une Version, chaque série du plus ancien au plus récent relevé. */
export function readPrintingHistory(db: AppDatabase, printingCode: PrintingCode): PrintingHistory {
  const rows = db
    .select({
      source: priceRecord.source,
      finish: priceRecord.finish,
      recordedAt: priceRecord.recordedAt,
      value: priceRecord.value,
    })
    .from(priceRecord)
    .where(eq(priceRecord.printingCode, printingCode))
    .orderBy(asc(priceRecord.recordedAt))
    .all();
  const history: PrintingHistory = {};
  for (const { source, finish, recordedAt, value } of rows) {
    const bySource = (history[source] ??= {});
    (bySource[finish] ??= []).push({ recordedAt, value });
  }
  return history;
}

/**
 * La valeur de l'Indicateur de référence de chaque Version × Finition
 * (`printingFinishKey`) à la fin du jour `day` (UTC) : celle de son dernier
 * relevé avant le jour suivant.
 */
export function referenceMetricValuesOn(
  db: AppDatabase,
  source: PriceSource,
  day: IsoDate,
): Map<string, number> {
  // Avec max(), SQLite donne les autres colonnes de la ligne qui porte ce maximum.
  const rows = db
    .select({
      printingCode: priceRecord.printingCode,
      finish: priceRecord.finish,
      value: priceRecord.value,
      recordedAt: sql<string>`max(${priceRecord.recordedAt})`,
    })
    .from(priceRecord)
    .where(
      and(
        eq(priceRecord.source, source),
        lt(priceRecord.recordedAt, `${addDays(day, 1)}T00:00:00.000Z`),
      ),
    )
    .groupBy(priceRecord.printingCode, priceRecord.finish)
    .all();
  return new Map(rows.map((row) => [printingFinishKey(row), row.value]));
}

/**
 * Les Relevés de prix d'une source pour les Versions de la Collection, par
 * Version × Finition (`printingFinishKey`), du plus ancien au plus récent.
 */
export function readCollectionPriceHistory(
  db: AppDatabase,
  source: PriceSource,
): OwnedPrintingHistory {
  const rows = db
    .select({
      printingCode: priceRecord.printingCode,
      finish: priceRecord.finish,
      recordedAt: priceRecord.recordedAt,
      value: priceRecord.value,
    })
    .from(priceRecord)
    .where(
      and(
        eq(priceRecord.source, source),
        inArray(
          priceRecord.printingCode,
          db.select({ printingCode: collectionEntry.printingCode }).from(collectionEntry),
        ),
      ),
    )
    .orderBy(asc(priceRecord.recordedAt))
    .all();
  const history = new Map<string, Pick<PriceRecord, 'recordedAt' | 'value'>[]>();
  for (const { recordedAt, value, ...printingFinish } of rows) {
    const key = printingFinishKey(printingFinish);
    history.set(key, [...(history.get(key) ?? []), { recordedAt, value }]);
  }
  return history;
}
