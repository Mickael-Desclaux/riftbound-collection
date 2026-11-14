/**
 * Alertes de prix (spec § 3 point 10) : une Version de la Liste de souhaits
 * qui a baissé d'au moins le seuil global depuis son ajout, ou depuis le prix
 * de sa dernière alerte. Tout se calcule dans la Source de prix choisie, en
 * devise d'origine.
 */
import { toIsoDate, type IsoDate, type IsoDateTime } from './dates';
import type { PriceSource } from './price';
import { dailySeries, percentChange, type RecordedValue } from './priceHistory';
import type { PrintingCode } from './printingCode';

/** La dernière Alerte de prix d'un souhait, dans la devise d'origine de sa source. */
export type LastPriceAlert = { price: number; source: PriceSource; at: IsoDateTime };

/** Un souhait à vérifier, avec les relevés de sa Finition de référence dans la source choisie. */
export type PriceAlertCandidate = {
  printingCode: PrintingCode;
  cardName: string;
  addedAt: IsoDateTime;
  lastAlert: LastPriceAlert | null;
  records: readonly RecordedValue[];
};

/**
 * Une Alerte de prix : le prix du jour dans la source choisie, et sa baisse en
 * % depuis l'ajout ou depuis la dernière alerte.
 */
export type PriceAlert = {
  printingCode: PrintingCode;
  cardName: string;
  source: PriceSource;
  price: number;
  change: number;
};

export type PriceAlertRule = {
  source: PriceSource;
  /** Seuil de baisse, en %. */
  threshold: number;
  today: IsoDate;
};

/** Tolère l'arrondi des flottants : 10 → 8,5 est bien une baisse de 15 %. */
const EPSILON = 1e-9;

/** Les Alertes de prix à émettre parmi `candidates`. */
export function priceAlerts(
  candidates: readonly PriceAlertCandidate[],
  { source, threshold, today }: PriceAlertRule,
): PriceAlert[] {
  const alerts: PriceAlert[] = [];
  for (const { printingCode, cardName, addedAt, lastAlert, records } of candidates) {
    const series = dailySeries(records, { start: toIsoDate(new Date(addedAt)), end: today });
    const price = series.at(-1)?.value ?? null;
    // Une alerte donnée dans une autre source ne se compare pas à celle-ci.
    const base = lastAlert?.source === source ? lastAlert.price : (series[0]?.value ?? null);
    const change = percentChange(base, price);
    if (price !== null && change !== null && change <= -threshold + EPSILON) {
      alerts.push({ printingCode, cardName, source, price, change });
    }
  }
  return alerts;
}
