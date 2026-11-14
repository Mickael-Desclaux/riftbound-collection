import type { SyncMode, SyncReport } from './syncAll';

/**
 * Une seule synchronisation à la fois, que la demande vienne de l'app ou de la
 * tâche en arrière-plan. Une vérification ordinaire (`auto`) demandée pendant
 * qu'une synchronisation tourne la rejoint ; une mise à jour demandée par
 * l'utilisateur (tirer-pour-rafraîchir, Réglages) attend sa fin puis est lancée.
 */
export function serializeSyncs(
  sync: (mode: SyncMode) => Promise<SyncReport>,
): (mode: SyncMode) => Promise<SyncReport> {
  let running: Promise<SyncReport> | null = null;
  return function synchronize(mode): Promise<SyncReport> {
    if (running) {
      const after = running.then(
        () => undefined,
        () => undefined,
      );
      return mode === 'auto' ? running : after.then(() => synchronize(mode));
    }
    const current = sync(mode).finally(() => {
      running = null;
    });
    running = current;
    return current;
  };
}
