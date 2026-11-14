/**
 * Valeur de la collection (spec § 2.3, § 3) : quantité × prix de la Finition de
 * référence. Les Versions sans prix en sont exclues et comptées à part. Son
 * évolution porte sur les cartes possédées aujourd'hui, pas sur l'historique
 * des achats.
 */
import type { CatalogEntry } from './catalogEntry';
import { addDays, type DateRange, type IsoDate } from './dates';
import type { Finish } from './price';
import { referenceFinish } from './priceDisplay';
import { dailySeries, firstRecordDay, percentChange, type DailyPoint } from './priceHistory';
import { printingFinishKey, type PriceRecord } from './priceRecords';
import type { PrintingCode } from './printingCode';

/** « N versions · M cartes · K sans prix », et la valeur dans la Devise d'affichage. */
export type CollectionValue = {
  value: number;
  printingCount: number;
  cardCount: number;
  unpricedCount: number;
};

/** La Valeur de la collection, d'après le prix de chaque Version dans la Devise d'affichage. */
export function collectionValue(entries: readonly CatalogEntry[]): CollectionValue {
  const result: CollectionValue = { value: 0, printingCount: 0, cardCount: 0, unpricedCount: 0 };
  for (const { ownedQuantity, price } of entries) {
    if (ownedQuantity <= 0) continue;
    result.printingCount += 1;
    result.cardCount += ownedQuantity;
    if (price === null) result.unpricedCount += 1;
    else result.value += ownedQuantity * price;
  }
  return result;
}

/** Une Version possédée, valorisée par sa Finition de référence. */
export type Holding = { printingCode: PrintingCode; finish: Finish; quantity: number };

/** Les Versions possédées qui ont une Finition de référence (une Version inconnue n'en a pas). */
export function holdingsOf(entries: readonly CatalogEntry[]): Holding[] {
  return entries.flatMap((entry) => {
    const finish = referenceFinish(entry.finishes);
    if (entry.ownedQuantity <= 0 || !entry.inCatalog || !finish) return [];
    return [{ printingCode: entry.printingCode, finish, quantity: entry.ownedQuantity }];
  });
}

/**
 * Les Relevés de prix de la Source de prix choisie, en devise d'origine, par
 * Version × Finition (`printingFinishKey`), du plus ancien au plus récent.
 */
export type HoldingHistory = ReadonlyMap<
  string,
  readonly Pick<PriceRecord, 'recordedAt' | 'value'>[]
>;

/** Le jour (UTC) du plus ancien relevé des Versions possédées : le début de « Tout ». */
export function firstHoldingRecordDay(
  holdings: readonly Holding[],
  history: HoldingHistory,
): IsoDate | undefined {
  let first: IsoDate | undefined;
  for (const holding of holdings) {
    const day = firstRecordDay(history.get(printingFinishKey(holding)) ?? []);
    if (day !== undefined && (first === undefined || day < first)) first = day;
  }
  return first;
}

/** La valeur de chaque jour de `range` de chaque Version possédée, quantité comprise. */
function holdingSeries(
  holdings: readonly Holding[],
  history: HoldingHistory,
  range: DateRange,
): DailyPoint[][] {
  return holdings.map((holding) =>
    dailySeries(history.get(printingFinishKey(holding)) ?? [], range).map(({ date, value }) => ({
      date,
      value: value * holding.quantity,
    })),
  );
}

/**
 * La valeur des cartes possédées aujourd'hui, jour par jour, en devise
 * d'origine. Un jour où aucune n'a encore de relevé n'a pas de point.
 */
export function collectionValueSeries(
  holdings: readonly Holding[],
  history: HoldingHistory,
  range: DateRange,
): DailyPoint[] {
  const totals = new Map<IsoDate, number>();
  for (const series of holdingSeries(holdings, history, range)) {
    for (const { date, value } of series) totals.set(date, (totals.get(date) ?? 0) + value);
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));
}

/**
 * Variation en % sur 30 jours de la valeur des cartes possédées, en devise
 * d'origine. Seules comptent les Versions qui avaient déjà un prix il y a
 * 30 jours : un prix apparu entre-temps n'est pas une hausse.
 */
export function collectionValueChange(
  holdings: readonly Holding[],
  history: HoldingHistory,
  today: IsoDate,
): number | null {
  const start = addDays(today, -30);
  let before = 0;
  let after = 0;
  for (const series of holdingSeries(holdings, history, { start, end: today })) {
    const first = series[0];
    const last = series.at(-1);
    if (first?.date !== start || last === undefined) continue;
    before += first.value;
    after += last.value;
  }
  return percentChange(before, after);
}
