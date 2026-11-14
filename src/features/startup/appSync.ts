/**
 * Racine de composition partagée par l'app ouverte et la tâche en
 * arrière-plan : une seule base, et une seule synchronisation à la fois.
 * C'est ici que la base, `fetch` et l'horloge sont créés.
 */
import { AppState } from 'react-native';

import type { AppDatabase } from '@/data/database';
import { openAppDatabase } from '@/data/openAppDatabase';
import { checkPriceAlerts } from '@/data/priceAlerts';
import { getSetting } from '@/data/settings';
import { newExpansionAnnouncer, priceAlertAnnouncer } from '@/features/notifications/announcer';
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

/** Annonce les nouvelles Extensions de `report`. */
async function announceNewExpansions(report: SyncReport): Promise<void> {
  await newExpansionAnnouncer.announce(report.newExpansions, {
    enabled: getSetting(appDatabase(), 'newExpansionNotifications'),
    appIsActive: AppState.currentState === 'active',
  });
}

/** Vérifie les Alertes de prix des souhaits (spec § 3 point 10), et les annonce. */
async function announcePriceAlerts(): Promise<void> {
  const { db, now } = appSyncDeps();
  // Coupées, les alertes ne sont même pas retenues : rien ne se perd en silence.
  if (!getSetting(db, 'priceAlertNotifications')) return;
  await priceAlertAnnouncer.announce(checkPriceAlerts(db, now()), {
    enabled: true,
    appIsActive: AppState.currentState === 'active',
  });
}

/**
 * Toutes les sources (`syncAll`), une synchronisation à la fois, puis les
 * annonces : nouvelles Extensions et Alertes de prix. Une annonce manquée ne
 * fait pas échouer la synchronisation, déjà enregistrée.
 */
const queue = serializeSyncs(async (mode: SyncMode): Promise<SyncReport> => {
  const report = await syncAll(appSyncDeps(), { mode });
  try {
    await announceNewExpansions(report);
  } catch (error) {
    console.warn('Annonce des nouvelles extensions impossible', error);
  }
  try {
    await announcePriceAlerts();
  } catch (error) {
    console.warn('Vérification des alertes de prix impossible', error);
  }
  return report;
});

export const synchronizeApp = queue.synchronize;

/**
 * Se résout quand aucune synchronisation ne tourne : les migrations attendent
 * ainsi celle que la tâche en arrière-plan a pu lancer avant l'ouverture de l'app.
 */
export const syncsIdle = queue.idle;
