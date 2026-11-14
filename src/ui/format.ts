/** Formatage des nombres, des montants et libellés partagés par les écrans. */
import type { CollectionValue } from '@/domain/collectionValue';
import { completionPercent, type ExpansionCompletion } from '@/domain/completion';
import type { IsoDate, IsoDateTime } from '@/domain/dates';
import type { Currency } from '@/domain/price';
import type { WishlistCost } from '@/domain/wishlist';

const formatInteger = new Intl.NumberFormat('fr-FR').format;

/** « 1 version », « 1 725 versions ». */
export function formatPrintingCount(count: number): string {
  return `${formatInteger(count)} ${count > 1 ? 'versions' : 'version'}`;
}

/** « 12 versions · 30 cartes · 2 sans prix » : l'en-tête de la Valeur de la collection. */
export function formatCollectionCounts({
  printingCount,
  cardCount,
  unpricedCount,
}: Omit<CollectionValue, 'value'>): string {
  return `${formatPrintingCount(printingCount)} · ${formatCardCount(cardCount)} · ${formatInteger(unpricedCount)} sans prix`;
}

/** « 1 souhait », « 3 souhaits ». */
export function formatWishCount(count: number): string {
  return `${formatInteger(count)} ${count > 1 ? 'souhaits' : 'souhait'}`;
}

/** « 1 carte », « 30 cartes ». */
function formatCardCount(count: number): string {
  return `${formatInteger(count)} ${count > 1 ? 'cartes' : 'carte'}`;
}

/** « 1 carte · 1 page A4 », « 12 cartes · 2 pages A4 » : le résumé du classeur. */
export function formatBinderSummary(cardCount: number, pageCount: number): string {
  return `${formatCardCount(cardCount)} · ${formatInteger(pageCount)} ${pageCount > 1 ? 'pages' : 'page'} A4`;
}

/** « Ajouter le résultat au classeur », « Ajouter les 12 résultats au classeur ». */
export function formatAddResultsToBinder(count: number): string {
  if (count === 1) return 'Ajouter le résultat au classeur';
  return `Ajouter les ${formatInteger(count)} résultats au classeur`;
}

/** « 1 carte ajoutée au classeur », « 12 cartes ajoutées au classeur ». */
export function formatBinderAdded(count: number): string {
  return `${formatCardCount(count)} ${count > 1 ? 'ajoutées' : 'ajoutée'} au classeur`;
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

const formatLocalDate = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format;
const formatUtcDate = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
}).format;

/** « 11 novembre 2026 », à l'heure de l'appareil. */
export function formatDate(at: IsoDateTime): string {
  return formatLocalDate(new Date(at));
}

/** Une date du calendrier (`AAAA-MM-JJ`), sans décalage de fuseau : « 10 novembre 2026 ». */
export function formatIsoDate(date: IsoDate): string {
  return formatUtcDate(new Date(`${date}T00:00:00Z`));
}

const formatOneDecimal = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
}).format;

/** « 10,0 % » : un pourcentage sans signe. */
export function formatPercent(value: number): string {
  return `${formatOneDecimal(Math.abs(value))} %`;
}

/** « +10,0 % », « −3,5 % » : une variation, toujours signée. */
export function formatPercentChange(change: number): string {
  const sign = change > 0 ? '+' : change < 0 ? '−' : '';
  return `${sign}${formatPercent(change)}`;
}

const formatDayMonth = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
}).format;

/** Une date du calendrier en abrégé : « 1 oct. ». */
export function formatShortIsoDate(date: IsoDate): string {
  return formatDayMonth(new Date(`${date}T00:00:00Z`));
}

/** La Complétion d'une Extension : « 54 / 352 · 15 % ». */
export function formatCompletion(completion: ExpansionCompletion): string {
  const { owned, total } = completion;
  return `${formatInteger(owned)} / ${formatInteger(total)} · ${completionPercent(completion)}${NBSP}%`;
}

/** « 3 cartes · coût total 12,40 € · 1 sans prix » : l'en-tête des Souhaits. */
export function formatWishlistCost(
  { printingCount, total, unpricedCount }: WishlistCost,
  currency: Currency,
): string {
  return `${formatCardCount(printingCount)} · coût total ${formatPrice(total, currency)} · ${formatInteger(unpricedCount)} sans prix`;
}

const formatTwoDigitDayMonth = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
}).format;

/** « 11/11 », à l'heure de l'appareil. */
export function formatNumericDayMonth(at: IsoDateTime): string {
  return formatTwoDigitDayMonth(new Date(at));
}

const formatLocalDay = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
}).format;
const formatLocalTime = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
}).format;

/** « 14/11/2026 à 10:32 », à l'heure de l'appareil. */
export function formatDateTime(at: IsoDateTime): string {
  const date = new Date(at);
  return `${formatLocalDay(date)} à ${formatLocalTime(date)}`;
}
