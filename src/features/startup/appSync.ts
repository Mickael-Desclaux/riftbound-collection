/**
 * Racine de composition partagée par l'app ouverte et la tâche en
 * arrière-plan : une seule base, et une seule synchronisation à la fois.
 * C'est ici que la base, `fetch` et l'horloge sont créés.
 */
import { AppState } from 'react-native';

import type { AppDatabase } from '@/data/database';
import { openAppDatabase } from '@/data/openAppDatabase';
import { getSetting } from '@/data/settings';
import { newExpansionAnnouncer } from '@/features/notifications/newExpansionAnnouncer';
import type { SyncDeps } from '@/sync/catalog';
import { syncAll, type SyncMode, type SyncReport } from '@/sync/syncAll';
import { serializeSyncs } from '@/sync/syncQueue';

let deps: SyncDeps | undefined;

/**
 * La base et les dépendances de la synchronisation, créées au premier appel.
 * Une seule connexion : les requêtes réactives de l'écran ne voient que les
 * écritures faites par la leur, y compris celles de la tâche en arrière-plan.
 */
export function appSyncDeps(): SyncDeps {
  deps ??= { db: openAppDatabase(), fetch: globalThis.fetch, now: () => new Date() };
  return deps;
}

export function appDatabase(): AppDatabase {
  return appSyncDeps().db;
}

/** Toutes les sources (`syncAll`), une synchronisation à la fois, puis l'annonce des nouvelles Extensions. */
const queue = serializeSyncs(async (mode: SyncMode): Promise<SyncReport> => {
  const report = await syncAll(appSyncDeps(), { mode });
  try {
    await newExpansionAnnouncer.announce(report.newExpansions, {
      enabled: getSetting(appDatabase(), 'newExpansionNotifications'),
      appIsActive: AppState.currentState === 'active',
    });
  } catch (error) {
    // Une annonce manquée ne fait pas échouer la synchronisation, déjà enregistrée.
    console.warn('Annonce des nouvelles extensions impossible', error);
  }
  return report;
});

export const synchronizeApp = queue.synchronize;

/**
 * Se résout quand aucune synchronisation ne tourne : les migrations attendent
 * ainsi celle que la tâche en arrière-plan a pu lancer avant l'ouverture de l'app.
 */
export const syncsIdle = queue.idle;
