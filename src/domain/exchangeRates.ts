/**
 * Taux de change (spec § 3) : un prix se convertit au dernier taux connu à sa
 * date. Il n'y a pas de cotation les week-ends et jours fériés.
 */
import type { IsoDate } from './dates';
import { CURRENCIES, type Currency } from './price';

export type ExchangeRateSource = 'frankfurter' | 'bank-of-canada';

/** La source principale ; l'autre ne sert que si elle échoue. */
export const PRIMARY_RATE_SOURCE: ExchangeRateSource = 'frankfurter';

/** 1 `baseCurrency` vaut `rate` `quoteCurrency`, à la date `date`. */
export type ExchangeRate = {
  date: IsoDate;
  baseCurrency: Currency;
  quoteCurrency: Currency;
  rate: number;
  source: ExchangeRateSource;
};

/** Les taux USD → CAD et USD → EUR d'un jour, tels que les sources les publient. */
export function usdRates(
  date: IsoDate,
  { CAD, EUR }: { CAD: number; EUR: number },
  source: ExchangeRateSource,
): ExchangeRate[] {
  return [
    { date, baseCurrency: 'USD', quoteCurrency: 'CAD', rate: CAD, source },
    { date, baseCurrency: 'USD', quoteCurrency: 'EUR', rate: EUR, source },
  ];
}

/**
 * Le taux retenu pour une conversion, et la date de cotation qu'il porte
 * (`null` quand il n'y a rien à convertir).
 */
export type AppliedRate = { rate: number; date: IsoDate | null };

/**
 * Le taux pour convertir `from` en `to` à la date `date` : le dernier connu à
 * une date ≤ `date`. Il se lit dans la paire elle-même, dans la paire inverse,
 * ou en croisant deux paires de même base (EUR → CAD par USD → EUR et USD → CAD).
 */
export function rateOnOrBefore(
  rates: readonly ExchangeRate[],
  from: Currency,
  to: Currency,
  date: IsoDate,
): AppliedRate | undefined {
  if (from === to) return { rate: 1, date: null };
  const direct = latestQuote(rates, from, to, date);
  if (direct) return { rate: direct.rate, date: direct.date };
  const inverse = latestQuote(rates, to, from, date);
  if (inverse) return { rate: 1 / inverse.rate, date: inverse.date };
  for (const base of CURRENCIES) {
    if (base === from || base === to) continue;
    const toFrom = latestQuote(rates, base, from, date);
    const toTo = latestQuote(rates, base, to, date);
    if (!toFrom || !toTo) continue;
    return {
      rate: toTo.rate / toFrom.rate,
      date: toFrom.date < toTo.date ? toFrom.date : toTo.date,
    };
  }
  return undefined;
}

/** La dernière cotation de la paire `base` → `quote` à une date ≤ `date`. */
function latestQuote(
  rates: readonly ExchangeRate[],
  base: Currency,
  quote: Currency,
  date: IsoDate,
): ExchangeRate | undefined {
  let found: ExchangeRate | undefined;
  for (const r of rates) {
    // Les dates ISO se comparent comme des chaînes.
    if (r.baseCurrency !== base || r.quoteCurrency !== quote || r.date > date) continue;
    if (!found || r.date > found.date) found = r;
  }
  return found;
}

/**
 * Le dernier taux de chaque paire. Pour convertir beaucoup de prix du jour, on
 * réduit les taux une fois, plutôt que de parcourir tout l'historique par prix.
 */
export function latestRatePerPair(rates: readonly ExchangeRate[]): ExchangeRate[] {
  const latest = new Map<string, ExchangeRate>();
  for (const r of rates) {
    const pair = `${r.baseCurrency}>${r.quoteCurrency}`;
    const known = latest.get(pair);
    if (!known || r.date > known.date) latest.set(pair, r);
  }
  return [...latest.values()];
}
