/** Formatage des nombres, des montants et libellés partagés par les écrans. */
import type { IsoDate, IsoDateTime } from '@/domain/dates';
import type { Currency, PriceSource } from '@/domain/price';

const formatInteger = new Intl.NumberFormat('fr-FR').format;

/** « 1 version », « 1 725 versions ». */
export function formatPrintingCount(count: number): string {
  return `${formatInteger(count)} ${count > 1 ? 'versions' : 'version'}`;
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

/** Un montant saisi (« 12,5 » ou « 12.5 ») ; `null` si la saisie est vide ou illisible. */
export function parseAmount(text: string): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (!/^\d+(\.\d*)?$/.test(trimmed)) return null;
  return Number(trimmed);
}

/** Nom affiché de chaque Source de prix. */
export const PRICE_SOURCE_LABELS: Record<PriceSource, string> = {
  tcgplayer: 'TCGplayer',
  cardmarket: 'Cardmarket',
};

const formatDateParts = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format;
const formatCalendarDay = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
}).format;

/** « 11 novembre 2026 », à l'heure de l'appareil. */
export function formatDate(at: IsoDateTime): string {
  return formatDateParts(new Date(at));
}

/** Une date du calendrier (`AAAA-MM-JJ`), sans décalage de fuseau : « 10 novembre 2026 ». */
export function formatIsoDate(date: IsoDate): string {
  return formatCalendarDay(new Date(`${date}T00:00:00Z`));
}
