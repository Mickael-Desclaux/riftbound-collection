/**
 * Adaptateur Frankfurter (`/v1/`, données BCE) : taux USD → EUR et USD → CAD.
 * Il n'y a qu'un taux par jour ouvré ; une plage qui commence un week-end ou un
 * jour férié est ramenée par Frankfurter au dernier jour ouvré qui précède.
 */
import { z } from 'zod';

import type { IsoDate } from '@/domain/dates';
import type { ExchangeRate } from '@/domain/exchangeRates';
import { fetchJson, type Fetch } from '@/sources/http';

const FRANKFURTER_URL = 'https://api.frankfurter.dev/v1';

export function frankfurterRangeUrl(start: IsoDate, end: IsoDate): string {
  return `${FRANKFURTER_URL}/${start}..${end}?base=USD&symbols=EUR,CAD`;
}

const rate = z.number().positive();
const rangeSchema = z.object({
  amount: z.literal(1),
  base: z.literal('USD'),
  start_date: z.iso.date(),
  end_date: z.iso.date(),
  rates: z.record(z.iso.date(), z.object({ CAD: rate, EUR: rate })),
});

/** Les taux de chaque jour ouvré entre `start` et `end`, plus le dernier qui précède `start`. */
export async function fetchFrankfurterRates(
  fetch: Fetch,
  start: IsoDate,
  end: IsoDate,
): Promise<ExchangeRate[]> {
  const response = await fetchJson(fetch, frankfurterRangeUrl(start, end), rangeSchema);
  return Object.entries(response.rates).flatMap(([date, { CAD, EUR }]) => [
    { date, baseCurrency: 'USD', quoteCurrency: 'CAD', rate: CAD, source: 'frankfurter' },
    { date, baseCurrency: 'USD', quoteCurrency: 'EUR', rate: EUR, source: 'frankfurter' },
  ]);
}
