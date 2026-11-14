/**
 * Alertes de prix (spec § 3 point 10) : une Version qui a changé d'au moins
 * un seuil depuis son ajout, ou depuis le prix de sa dernière alerte. Une
 * baisse pour la Liste de souhaits, une hausse pour la Collection. Tout se
 * calcule dans la Source de prix choisie, en devise d'origine.
 */
import { toIsoDate, type IsoDate, type IsoDateTime } from './dates';
import type { PriceSource } from './price';
import { dailySeries, percentChange, type RecordedValue } from './priceHistory';
import type { PrintingCode } from './printingCode';

/** Le sens surveillé : baisse d'un souhait, hausse d'une Version de la Collection. */
export type PriceAlertDirection = 'drop' | 'rise';

/** La dernière Alerte de prix d'une Version, dans la devise d'origine de sa source. */
export type LastPriceAlert = { price: number; source: PriceSource; at: IsoDateTime };

/** Une Version à vérifier, avec les relevés de sa Finition de référence dans la source choisie. */
export type PriceAlertCandidate = {
  printingCode: PrintingCode;
  cardName: string;
  /** Ajout aux souhaits, ou entrée dans la Collection. */
  addedAt: IsoDateTime;
  lastAlert: LastPriceAlert | null;
  records: readonly RecordedValue[];
};

/**
 * Une Alerte de prix : le prix du jour dans la source choisie, et sa variation
 * en % depuis l'ajout ou depuis la dernière alerte (négative pour une baisse).
 */
export type PriceAlert = {
  printingCode: PrintingCode;
  cardName: string;
  direction: PriceAlertDirection;
  source: PriceSource;
  price: number;
  change: number;
};

export type PriceAlertRule = {
  direction: PriceAlertDirection;
  source: PriceSource;
  /** Seuil de variation, en %, positif dans les deux sens. */
  threshold: number;
  today: IsoDate;
};

/** Tolère l'arrondi des flottants : 10 → 8,5 est bien une baisse de 15 %. */
const EPSILON = 1e-9;

/** La variation `change` (en %) atteint-elle le seuil dans le sens surveillé ? */
function reaches(change: number, direction: PriceAlertDirection, threshold: number): boolean {
  return direction === 'drop' ? change <= -threshold + EPSILON : change >= threshold - EPSILON;
}

/** Les Alertes de prix à émettre parmi `candidates`. */
export function priceAlerts(
  candidates: readonly PriceAlertCandidate[],
  { direction, source, threshold, today }: PriceAlertRule,
): PriceAlert[] {
  const alerts: PriceAlert[] = [];
  for (const { printingCode, cardName, addedAt, lastAlert, records } of candidates) {
    const series = dailySeries(records, { start: toIsoDate(new Date(addedAt)), end: today });
    const price = series.at(-1)?.value ?? null;
    // Une alerte donnée dans une autre source ne se compare pas à celle-ci.
    const base = lastAlert?.source === source ? lastAlert.price : (series[0]?.value ?? null);
    const change = percentChange(base, price);
    if (price !== null && change !== null && reaches(change, direction, threshold)) {
      alerts.push({ printingCode, cardName, direction, source, price, change });
    }
  }
  return alerts;
}
