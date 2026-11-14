import type { PriceAlert, PriceAlertDirection } from '@/domain/priceAlert';
import { formatPercent } from '@/ui/format';

/** Les mots de chaque sens : baisses des souhaits, hausses de la Collection. */
const WORDING = {
  drop: { one: 'Alerte de prix', several: 'Alertes de prix', verb: 'baissé', list: 'tes souhaits' },
  rise: { one: 'Hausse de prix', several: 'Hausses de prix', verb: 'monté', list: 'ta collection' },
} as const;

/** Le titre de la notification des alertes `alerts`, toutes dans le sens `direction`. */
export function priceAlertsTitle(
  direction: PriceAlertDirection,
  alerts: readonly PriceAlert[],
): string {
  const { one, several } = WORDING[direction];
  return alerts.length > 1 ? several : one;
}

/** La phrase de la notification : une seule pour toutes les cartes (spec § 3 point 10). */
export function priceAlertsText(
  direction: PriceAlertDirection,
  alerts: readonly PriceAlert[],
): string {
  const { verb, list } = WORDING[direction];
  const [only] = alerts;
  if (alerts.length === 1 && only) {
    return `${only.cardName} a ${verb} de ${formatPercent(only.change)}.`;
  }
  return `${alerts.length} cartes de ${list} ont ${verb}.`;
}
