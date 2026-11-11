/**
 * Historique des prix (spec § 2.2, § 3) : graphique d'évolution et Variation
 * de prix. Un Relevé de prix n'existe que lorsque la valeur change ; entre deux
 * relevés, la valeur est prolongée. Un relevé compte pour son jour UTC.
 */
import { addDays, toIsoDate, type DateRange, type IsoDate, type IsoDateTime } from './dates';
import { rateOnOrBefore, type ExchangeRate } from './exchangeRates';
import type { Currency } from './price';
import type { ChartPeriod, ChartPresetPeriod } from './settings';

/** Un Relevé de prix d'une Version × Source × Finition, dans la devise d'origine. */
export type HistoryRecord = { recordedAt: IsoDateTime; value: number };

/** La valeur d'un jour. */
export type DailyPoint = { date: IsoDate; value: number };

/** Le dernier relevé de chaque jour, par ordre chronologique. */
function lastOfEachDay(records: readonly HistoryRecord[]): DailyPoint[] {
  const byDay = new Map<IsoDate, HistoryRecord>();
  for (const record of records) {
    const day = toIsoDate(new Date(record.recordedAt));
    const known = byDay.get(day);
    if (!known || record.recordedAt > known.recordedAt) byDay.set(day, record);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, record]) => ({ date, value: record.value }));
}

/**
 * Une valeur par jour de `range`, prolongée entre deux relevés. Les jours qui
 * précèdent le premier relevé n'ont pas de valeur.
 */
export function dailySeries(records: readonly HistoryRecord[], range: DateRange): DailyPoint[] {
  const days = lastOfEachDay(records);
  const series: DailyPoint[] = [];
  let next = 0;
  let current: number | undefined;
  for (let date = range.start; date <= range.end; date = addDays(date, 1)) {
    while (next < days.length && (days[next] as DailyPoint).date <= date) {
      current = (days[next] as DailyPoint).value;
      next += 1;
    }
    if (current !== undefined) series.push({ date, value: current });
  }
  return series;
}

/**
 * Chaque point converti au taux de sa date (spec § 3) : le dernier taux connu
 * à une date ≤ ce jour. Un jour sans taux connu est écarté.
 */
export function convertSeries(
  points: readonly DailyPoint[],
  from: Currency,
  to: Currency,
  rates: readonly ExchangeRate[],
): DailyPoint[] {
  return points.flatMap(({ date, value }) => {
    const rate = rateOnOrBefore(rates, from, to, date);
    return rate ? [{ date, value: value * rate.rate }] : [];
  });
}

const PERIOD_DAYS: Record<Exclude<ChartPresetPeriod, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
};

/**
 * Les jours couverts par une période du graphique. « Tout » part du premier
 * relevé (`firstDay`) ; « Dates… » ne dépasse jamais aujourd'hui.
 */
export function periodRange(
  period: ChartPeriod,
  today: IsoDate,
  firstDay: IsoDate | undefined,
): DateRange {
  if (typeof period === 'object') {
    return { start: period.from, end: period.to < today ? period.to : today };
  }
  if (period === 'all') return { start: firstDay ?? today, end: today };
  return { start: addDays(today, -PERIOD_DAYS[period]), end: today };
}

/** « Historique en cours de constitution » : le premier relevé est postérieur au début de la période. */
export function isHistoryBuilding(range: DateRange, firstDay: IsoDate | undefined): boolean {
  return firstDay !== undefined && firstDay > range.start;
}

/** Le jour (UTC) du premier relevé. */
export function firstRecordDay(records: readonly HistoryRecord[]): IsoDate | undefined {
  return lastOfEachDay(records)[0]?.date;
}

/** Variation en % de `from` à `to` ; `null` s'il manque une des deux valeurs. */
export function percentChange(from: number | null, to: number | null): number | null {
  if (from === null || to === null || from === 0) return null;
  return ((to - from) / from) * 100;
}

/** La valeur d'un jour : celle du dernier relevé à une date ≤ ce jour. */
function valueOn(records: readonly HistoryRecord[], date: IsoDate): number | null {
  return dailySeries(records, { start: date, end: date })[0]?.value ?? null;
}

/**
 * Variation de prix sur `days` jours (spec § 3), dans la devise d'origine :
 * `null` si l'historique ne remonte pas jusqu'au début de la période.
 */
export function priceChange(
  records: readonly HistoryRecord[],
  today: IsoDate,
  days: number,
): number | null {
  return percentChange(valueOn(records, addDays(today, -days)), valueOn(records, today));
}
