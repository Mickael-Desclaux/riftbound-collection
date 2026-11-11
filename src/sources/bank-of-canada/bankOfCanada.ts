/**
 * Adaptateur Banque du Canada (Valet), secours de Frankfurter : séries
 * `FXUSDCAD` et `FXEURCAD`, en CAD pour 1 unité. Il n'y a pas de paire
 * USD ↔ EUR : on la croise par le CAD. Réutilisation libre avec attribution
 * (https://www.bankofcanada.ca/terms/).
 */
import { z } from 'zod';

import { addDays, type IsoDate } from '@/domain/dates';
import type { ExchangeRate } from '@/domain/exchangeRates';
import { fetchJson, type Fetch } from '@/sources/http';

/**
 * Pas de cotation les week-ends et jours fériés canadiens : on remonte assez
 * loin pour trouver le dernier taux qui précède le début de la plage, même
 * entre Noël et le jour de l'An.
 */
const LOOKBACK_DAYS = 10;

export function bankOfCanadaUrl(start: IsoDate, end: IsoDate): string {
  return `https://www.bankofcanada.ca/valet/observations/FXUSDCAD,FXEURCAD/json?start_date=${start}&end_date=${end}`;
}

/** Les valeurs sont des chaînes décimales (`"1.4113"`). */
const value = z.object({
  v: z
    .string()
    .regex(/^\d+(\.\d+)?$/)
    .transform(Number)
    .pipe(z.number().positive()),
});
const observationsSchema = z.object({
  observations: z.array(z.object({ d: z.iso.date(), FXUSDCAD: value, FXEURCAD: value })),
});

/** Les taux de chaque jour ouvré entre `start` et `end`, plus ceux qui précèdent `start`. */
export async function fetchBankOfCanadaRates(
  fetch: Fetch,
  start: IsoDate,
  end: IsoDate,
): Promise<ExchangeRate[]> {
  const url = bankOfCanadaUrl(addDays(start, -LOOKBACK_DAYS), end);
  const response = await fetchJson(fetch, url, observationsSchema);
  return response.observations.flatMap(({ d: date, FXUSDCAD, FXEURCAD }) => [
    { date, baseCurrency: 'USD', quoteCurrency: 'CAD', rate: FXUSDCAD.v, source: 'bank-of-canada' },
    {
      date,
      baseCurrency: 'USD',
      quoteCurrency: 'EUR',
      rate: FXUSDCAD.v / FXEURCAD.v,
      source: 'bank-of-canada',
    },
  ]);
}
