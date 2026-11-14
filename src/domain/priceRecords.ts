/**
 * Historique des prix (spec § 3, § 5) : un Relevé de prix n'est enregistré que
 * lorsque la valeur de l'Indicateur de référence change, daté par la date de
 * publication de la source. Un même fichier ne crée donc jamais deux relevés.
 */
import type { IsoDateTime } from './dates';
import type { Currency, Finish, PriceSource } from './price';
import type { PrintingCode } from './printingCode';

/** Le prix du jour d'une Version, pour une Source de prix et une Finition. */
export type CurrentPrice = {
  printingCode: PrintingCode;
  source: PriceSource;
  finish: Finish;
  /** Valeur de l'Indicateur de référence, ou `null` si la source n'en donne pas. */
  referenceMetricValue: number | null;
  /** Tous les indicateurs publiés par la source, tels quels. */
  metrics: Record<string, number | null>;
  /** Devise d'origine de la source. */
  currency: Currency;
  publishedAt: IsoDateTime;
};

export type PriceRecord = {
  printingCode: PrintingCode;
  source: PriceSource;
  finish: Finish;
  recordedAt: IsoDateTime;
  value: number;
};

/** Le dernier relevé enregistré pour une Version × Source × Finition. */
export type LastRecord = Pick<PriceRecord, 'value' | 'recordedAt'>;

/** Clé d'une Version × Source × Finition, pour retrouver son dernier relevé. */
export function priceKey(price: Pick<CurrentPrice, 'printingCode' | 'source' | 'finish'>): string {
  return `${price.printingCode}|${price.source}|${price.finish}`;
}

/** Clé d'une Version × Finition, pour une Source de prix déjà choisie. */
export function printingFinishKey(price: Pick<CurrentPrice, 'printingCode' | 'finish'>): string {
  return `${price.printingCode}|${price.finish}`;
}

/** Les relevés à ajouter à l'historique pour ces prix du jour. */
export function newPriceRecords(
  prices: CurrentPrice[],
  lastRecords: Map<string, LastRecord>,
): PriceRecord[] {
  const records: PriceRecord[] = [];
  for (const price of prices) {
    const value = price.referenceMetricValue;
    if (value === null) continue;
    const last = lastRecords.get(priceKey(price));
    if (
      last &&
      (last.value === value || Date.parse(price.publishedAt) <= Date.parse(last.recordedAt))
    ) {
      continue;
    }
    records.push({
      printingCode: price.printingCode,
      source: price.source,
      finish: price.finish,
      recordedAt: price.publishedAt,
      value,
    });
  }
  return records;
}
