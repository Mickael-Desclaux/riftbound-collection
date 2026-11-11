/** Règles d'affichage des prix (spec § 3). */
import { toIsoDate, type IsoDate, type IsoDateTime } from './dates';
import { rateOnOrBefore, type ExchangeRate } from './exchangeRates';
import { FINISHES, type Currency, type Finish } from './price';

/** Aucun taux n'est daté au-delà : « le dernier taux connu ». */
const LATEST: IsoDate = '9999-12-31';

function convert(
  amount: number | null,
  from: Currency,
  to: Currency,
  rates: readonly ExchangeRate[],
  date: IsoDate,
): number | null {
  if (amount === null) return null;
  const applied = rateOnOrBefore(rates, from, to, date);
  return applied ? amount * applied.rate : null;
}

/** Prix du jour converti au dernier taux connu ; `null` sans prix ou sans taux. */
export function convertCurrentPrice(
  amount: number | null,
  from: Currency,
  to: Currency,
  rates: readonly ExchangeRate[],
): number | null {
  return convert(amount, from, to, rates, LATEST);
}

/**
 * Relevé de prix converti au taux de son jour (UTC) : le dernier taux à une
 * date ≤ ce jour. Le jour UTC donne le même résultat sur tout appareil.
 */
export function convertRecordedPrice(
  amount: number | null,
  from: Currency,
  to: Currency,
  rates: readonly ExchangeRate[],
  recordedAt: IsoDateTime,
): number | null {
  return convert(amount, from, to, rates, toIsoDate(new Date(recordedAt)));
}

/** Les prix du jour d'une Version pour une Source de prix, par Finition. */
export type FinishPrices = Partial<Record<Finish, { value: number | null; currency: Currency }>>;

/**
 * Le prix d'une Version dans les grilles : celui de sa Finition de référence,
 * dans la Devise d'affichage. Sans ce prix, `null` (« — ») : on ne se replie
 * jamais sur une autre Finition, une autre source ni un autre indicateur.
 */
export function referencePrice(
  finishes: readonly Finish[],
  prices: FinishPrices | undefined,
  displayCurrency: Currency,
  rates: readonly ExchangeRate[],
): number | null {
  const finish = referenceFinish(finishes);
  const price = finish && prices?.[finish];
  if (!price) return null;
  return convertCurrentPrice(price.value, price.currency, displayCurrency, rates);
}

/** Un montant saisi (« 12,5 » ou « 12.5 ») ; `null` si la saisie est vide ou illisible. */
export function parseAmount(text: string): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (!/^\d+(\.\d*)?$/.test(trimmed)) return null;
  return Number(trimmed);
}

const STALE_AFTER_MS = 48 * 60 * 60 * 1000;

/**
 * Vrai si les prix ont plus de 48 h, d'après la date de publication la plus
 * récente de la source : un bandeau global le signale (spec § 3).
 */
export function arePricesStale(latestPublishedAt: IsoDateTime | undefined, now: Date): boolean {
  if (latestPublishedAt === undefined) return false;
  return now.getTime() - Date.parse(latestPublishedAt) > STALE_AFTER_MS;
}

/** Espace insécable : le montant et sa devise ne se séparent jamais. */
const NBSP = '\u00a0';

const CURRENCY_SUFFIX: Record<Currency, string> = {
  CAD: `$${NBSP}CA`,
  USD: `$${NBSP}US`,
  EUR: '€',
};

const formatAmount = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format;

/** Ce qui suit un montant : « $ CA », « $ US », « € ». */
export function currencySymbol(currency: Currency): string {
  return CURRENCY_SUFFIX[currency];
}

/** « 12,40 $ CA », « 12,40 $ US », « 12,40 € » ; « — » pour un prix absent. */
export function formatPrice(amount: number | null, currency: Currency): string {
  if (amount === null) return '—';
  return `${formatAmount(amount)}${NBSP}${CURRENCY_SUFFIX[currency]}`;
}

/** Finition de référence : normale si elle existe, sinon foil. */
export function referenceFinish(finishes: readonly Finish[]): Finish | undefined {
  return FINISHES.find((finish) => finishes.includes(finish));
}
