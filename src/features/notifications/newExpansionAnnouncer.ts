/**
 * Où annoncer une nouvelle Extension (spec § 5) : un message dans l'app si
 * elle est ouverte, une notification Android sinon (détection en arrière-plan).
 */
import type { NewExpansion } from '@/sync/syncAll';

import { notifyNewExpansions } from './notifications';

type Listener = (expansions: NewExpansion[]) => void;

export type AnnounceContext = {
  /** Le réglage « Nouvelles extensions ». */
  enabled: boolean;
  /** L'app est-elle au premier plan ? */
  appIsActive: boolean;
};

export function createNewExpansionAnnouncer(notify: (expansions: NewExpansion[]) => Promise<void>) {
  const listeners = new Set<Listener>();
  return {
    async announce(expansions: NewExpansion[], { enabled, appIsActive }: AnnounceContext) {
      if (!enabled || expansions.length === 0) return;
      // Sans écran pour l'afficher (app pas encore prête), le message deviendrait muet.
      if (appIsActive && listeners.size > 0) {
        for (const listener of listeners) listener(expansions);
        return;
      }
      await notify(expansions);
    },
    /** Pour le message dans l'app ; renvoie de quoi se désabonner. */
    subscribe(listener: Listener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** L'annonceur de l'app, partagé par l'app ouverte et la tâche en arrière-plan. */
export const newExpansionAnnouncer = createNewExpansionAnnouncer(notifyNewExpansions);
