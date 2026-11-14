import { addNetworkStateListener } from 'expo-network';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, AppState } from 'react-native';

import { hasCatalog } from '@/data/catalog';
import { useDatabase } from '@/data/DatabaseProvider';
import { fileSystemImageStore } from '@/features/binder/binderFiles';
import { requestNotificationPermission } from '@/features/notifications/notifications';
import { downloadBinderImages } from '@/sync/binderImages';
import { syncCatalog, type OnProgress } from '@/sync/catalog';
import { EMPTY_SYNC_REPORT, type ResyncMode, type SyncMode, type SyncReport } from '@/sync/syncAll';
import { ClockContext } from '@/ui/ClockContext';
import { SyncContext } from '@/ui/SyncContext';

import { appSyncDeps, synchronizeApp } from './appSync';
import { registerBackgroundSync } from './backgroundSync';
import { CatalogGate } from './CatalogGate';

/**
 * Prévient quand une nouvelle tentative a des chances de réussir : retour du
 * réseau, ou retour dans l'app (le réseau a pu revenir pendant qu'elle était
 * en arrière-plan, sans événement).
 */
function subscribeToOnline(listener: () => void): () => void {
  const network = addNetworkStateListener(({ isConnected, isInternetReachable }) => {
    if (isInternetReachable ?? isConnected) listener();
  });
  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') listener();
  });
  return () => {
    network.remove();
    appState.remove();
  };
}

/**
 * Une phrase d'explication, puis la question d'Android (spec § 5 : une seule
 * permission, demandée à la fin de la première synchronisation).
 */
function askForNotifications(): void {
  const request = () => {
    requestNotificationPermission().catch((error: unknown) =>
      console.warn('Permission des notifications impossible à demander', error),
    );
  };
  Alert.alert(
    'Notifications',
    'L’app peut vous prévenir quand une nouvelle extension sort, ou quand une carte de vos souhaits baisse. Vous pourrez couper chaque alerte dans les Réglages.',
    [{ text: 'Continuer', onPress: request }],
    { cancelable: false },
  );
}

/**
 * Branche `CatalogGate` sur l'app, avec les dépendances créées par `appSync`.
 *
 * - Catalogue absent : premier téléchargement, piloté par `CatalogGate`, puis
 *   la permission des notifications.
 * - Catalogue présent : toutes les sources (`syncAll`) sont vérifiées à
 *   l'ouverture, à chaque retour dans l'app et au tirer-pour-rafraîchir, et
 *   environ deux fois par jour en arrière-plan. Les échecs sont notés dans
 *   `source_state` (Réglages → « État des sources ») et réessayés la fois suivante.
 */
export function AppCatalogGate({ children }: { children: ReactNode }) {
  const db = useDatabase();
  const deps = appSyncDeps();
  // Lu une seule fois au démarrage : l'écran n'a pas à réagir à ce changement,
  // c'est `CatalogGate` qui passe à l'app à la fin du premier téléchargement.
  const [hadCatalogAtStart] = useState(() => hasCatalog(db));
  const catalogReady = useRef(hadCatalogAtStart);

  // Une seule synchronisation à la fois, partagée avec la tâche en arrière-plan.
  const synchronize = useCallback(
    (mode: SyncMode): Promise<SyncReport> =>
      catalogReady.current ? synchronizeApp(mode) : Promise.resolve(EMPTY_SYNC_REPORT),
    [],
  );

  const startSyncing = useCallback(() => {
    void synchronize('auto');
    registerBackgroundSync().catch((error: unknown) =>
      console.warn('Synchronisation en arrière-plan impossible à inscrire', error),
    );
  }, [synchronize]);

  useEffect(() => {
    if (catalogReady.current) startSyncing();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void synchronize('auto');
    });
    return () => subscription.remove();
  }, [synchronize, startSyncing]);

  const sync = useMemo(
    () => ({
      refresh: () => synchronize('refresh').then(() => undefined),
      resynchronize: (mode: ResyncMode) => synchronize(mode),
      downloadBinderImages: (
        urls: readonly string[],
        onProgress: (done: number, total: number) => void,
      ) =>
        downloadBinderImages({ fetch: deps.fetch, store: fileSystemImageStore }, urls, onProgress),
    }),
    [synchronize, deps],
  );

  const runFirstSync = useCallback(
    async (onProgress: OnProgress) => {
      await syncCatalog(deps, { onProgress });
      catalogReady.current = true;
      askForNotifications();
      // Les prix suivent en arrière-plan : seul le Catalogue est bloquant (spec § 6).
      startSyncing();
    },
    [deps, startSyncing],
  );

  return (
    <ClockContext.Provider value={deps.now}>
      <SyncContext.Provider value={sync}>
        <CatalogGate
          hasCatalog={hadCatalogAtStart}
          runFirstSync={runFirstSync}
          subscribeToOnline={subscribeToOnline}
        >
          {children}
        </CatalogGate>
      </SyncContext.Provider>
    </ClockContext.Provider>
  );
}
