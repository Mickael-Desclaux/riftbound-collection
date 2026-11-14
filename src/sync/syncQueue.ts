import type { SyncMode, SyncReport } from './syncAll';

export type SyncQueue = {
  /**
   * Une vérification ordinaire (`auto`) demandée pendant qu'une
   * synchronisation tourne la rejoint ; une mise à jour demandée par
   * l'utilisateur (tirer-pour-rafraîchir, Réglages) attend sa fin puis est lancée.
   */
  synchronize: (mode: SyncMode) => Promise<SyncReport>;
  /** Se résout quand plus aucune synchronisation ne tourne, réussie ou non. */
  idle: () => Promise<void>;
};

/**
 * Une seule synchronisation à la fois, que la demande vienne de l'app ou de
 * la tâche en arrière-plan.
 */
export function serializeSyncs(sync: (mode: SyncMode) => Promise<SyncReport>): SyncQueue {
  let running: Promise<SyncReport> | null = null;

  async function idle(): Promise<void> {
    while (running) {
      await running.then(
        () => undefined,
        () => undefined,
      );
    }
  }

  function synchronize(mode: SyncMode): Promise<SyncReport> {
    if (running) {
      return mode === 'auto' ? running : idle().then(() => synchronize(mode));
    }
    const current = sync(mode).finally(() => {
      running = null;
    });
    running = current;
    return current;
  }

  return { synchronize, idle };
}
