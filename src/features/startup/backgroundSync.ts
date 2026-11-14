/**
 * Synchronisation en arrière-plan (spec § 5) : expo-background-task relance
 * environ deux fois par jour, au mieux, la même vérification qu'à l'ouverture
 * de l'app. La tâche est définie au chargement du module : il doit être
 * importé par la racine de l'app (`src/app/_layout.tsx`).
 */
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { hasCatalog } from '@/data/catalog';
import { isUpToDate } from '@/data/migrate';
import migrations from '@/data/migrations/migrations';

import { appDatabase, synchronizeApp } from './appSync';

const BACKGROUND_SYNC_TASK = 'background-sync';

/** Environ deux fois par jour ; Android choisit le moment exact. */
const MINIMUM_INTERVAL_MINUTES = 12 * 60;

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const db = appDatabase();
    // Migrations et premier téléchargement restent l'affaire de l'app ouverte,
    // qui sait afficher leurs écrans d'échec.
    if (!isUpToDate(db, migrations) || !hasCatalog(db)) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }
    // Les pannes de sources sont notées dans source_state, comme à l'ouverture.
    await synchronizeApp('auto');
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.warn('Synchronisation en arrière-plan impossible', error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** Inscrit la tâche auprès d'Android ; sans effet si elle l'est déjà. */
export async function registerBackgroundSync(): Promise<void> {
  if (await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK)) return;
  await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
    minimumInterval: MINIMUM_INTERVAL_MINUTES,
  });
}
