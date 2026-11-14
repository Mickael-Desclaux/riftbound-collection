import type { PriceAlert } from '@/domain/priceAlert';
import { formatPercent } from '@/ui/format';

/** Le titre de la notification. */
export function priceAlertsTitle(alerts: readonly PriceAlert[]): string {
  return alerts.length > 1 ? 'Alertes de prix' : 'Alerte de prix';
}

/** La phrase de la notification : une seule pour toutes les cartes (spec § 3 point 10). */
export function priceAlertsText(alerts: readonly PriceAlert[]): string {
  const [only] = alerts;
  if (alerts.length === 1 && only) {
    return `${only.cardName} a baissé de ${formatPercent(only.change)}.`;
  }
  return `${alerts.length} cartes de tes souhaits ont baissé.`;
}
