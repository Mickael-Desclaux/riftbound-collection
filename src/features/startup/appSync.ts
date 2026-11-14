/**
 * Racine de composition partagée par l'app ouverte et la tâche en
 * arrière-plan : une seule base, et une seule synchronisation à la fois.
 * C'est ici que la base, `fetch` et l'horloge sont créés.
 */
import { AppState } from 'react-native';

import type { AppDatabase } from '@/data/database';
import { openAppDatabase } from '@/data/openAppDatabase';
import { findPriceAlerts, recordPriceAlerts } from '@/data/priceAlerts';
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
async function announceNewExpansions(db: AppDatabase, report: SyncReport): Promise<void> {
  await newExpansionAnnouncer.announce(report.newExpansions, {
    enabled: getSetting(db, 'newExpansionNotifications'),
    appIsActive: AppState.currentState === 'active',
  });
}

/**
 * Annonce les Alertes de prix des souhaits (spec § 3 point 10). Une alerte
 * n'est retenue qu'une fois affichée ou envoyée : refusée par Android, elle
 * sera retentée à la prochaine synchronisation.
 */
async function announcePriceAlerts(db: AppDatabase, now: Date): Promise<void> {
  const enabled = getSetting(db, 'priceAlertNotifications');
  const alerts = enabled ? findPriceAlerts(db, now) : [];
  const announced = await priceAlertAnnouncer.announce(alerts, {
    enabled,
    appIsActive: AppState.currentState === 'active',
  });
  if (announced) recordPriceAlerts(db, alerts, now);
}

/** Lance une annonce ; une annonce manquée ne fait pas échouer la synchronisation, déjà enregistrée. */
async function tryToAnnounce(what: string, announce: () => Promise<void>): Promise<void> {
  try {
    await announce();
  } catch (error) {
    console.warn(`Annonce impossible : ${what}`, error);
  }
}

/**
 * Toutes les sources (`syncAll`), une synchronisation à la fois, puis les
 * annonces : nouvelles Extensions et Alertes de prix.
 */
const queue = serializeSyncs(async (mode: SyncMode): Promise<SyncReport> => {
  const deps = appSyncDeps();
  const { db, now } = deps;
  const report = await syncAll(deps, { mode });
  await tryToAnnounce('nouvelles extensions', () => announceNewExpansions(db, report));
  await tryToAnnounce('alertes de prix', () => announcePriceAlerts(db, now()));
  return report;
});

export const synchronizeApp = queue.synchronize;

/**
 * Se résout quand aucune synchronisation ne tourne : les migrations attendent
 * ainsi celle que la tâche en arrière-plan a pu lancer avant l'ouverture de l'app.
 */
export const syncsIdle = queue.idle;
