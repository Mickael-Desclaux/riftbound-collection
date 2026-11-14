import type { PriceAlert } from '@/domain/priceAlert';
import { formatPercent } from '@/ui/format';

/** Toutes les alertes d'une annonce vont dans le même sens : on lit celui de la première. */
function isRise(alerts: readonly PriceAlert[]): boolean {
  return alerts[0]?.direction === 'rise';
}

/** Le titre de la notification. */
export function priceAlertsTitle(alerts: readonly PriceAlert[]): string {
  const several = alerts.length > 1;
  if (isRise(alerts)) return several ? 'Hausses de prix' : 'Hausse de prix';
  return several ? 'Alertes de prix' : 'Alerte de prix';
}

/** La phrase de la notification : une seule pour toutes les cartes (spec § 3 point 10). */
export function priceAlertsText(alerts: readonly PriceAlert[]): string {
  const [only] = alerts;
  const verb = isRise(alerts) ? 'monté' : 'baissé';
  if (alerts.length === 1 && only) {
    return `${only.cardName} a ${verb} de ${formatPercent(only.change)}.`;
  }
  const list = isRise(alerts) ? 'ta collection' : 'tes souhaits';
  return `${alerts.length} cartes de ${list} ont ${verb}.`;
}
