/**
 * Où annoncer une nouveauté (spec § 3 point 10, § 5) : dans l'app si elle est
 * ouverte (message des nouvelles Extensions, pastille des Alertes de prix),
 * par une notification Android sinon (détection en arrière-plan).
 */
import type { NewExpansion } from '@/domain/catalog';
import type { EmittedPriceAlert } from '@/data/priceAlerts';

import { notifyNewExpansions, notifyPriceAlerts } from './notifications';

type Listener<T> = (items: T[]) => void;

export type AnnounceContext = {
  /** Le réglage qui active cette annonce. */
  enabled: boolean;
  /** L'app est-elle au premier plan ? */
  appIsActive: boolean;
};

export function createAnnouncer<T>(notify: (items: T[]) => Promise<void>) {
  const listeners = new Set<Listener<T>>();
  return {
    async announce(items: T[], { enabled, appIsActive }: AnnounceContext) {
      if (!enabled || items.length === 0) return;
      // Sans écran pour l'afficher (app pas encore prête), l'annonce deviendrait muette.
      if (appIsActive && listeners.size > 0) {
        for (const listener of listeners) listener(items);
        return;
      }
      await notify(items);
    },
    /** Pour l'annonce dans l'app ; renvoie de quoi se désabonner. */
    subscribe(listener: Listener<T>): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Les annonceurs de l'app, partagés par l'app ouverte et la tâche en arrière-plan. */
export const newExpansionAnnouncer = createAnnouncer<NewExpansion>(notifyNewExpansions);
export const priceAlertAnnouncer = createAnnouncer<EmittedPriceAlert>(notifyPriceAlerts);
