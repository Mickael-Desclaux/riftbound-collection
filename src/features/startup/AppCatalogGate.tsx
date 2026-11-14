import { addNetworkStateListener } from 'expo-network';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { hasCatalog } from '@/data/catalog';
import { useDatabase } from '@/data/DatabaseProvider';
import { fileSystemImageStore } from '@/features/binder/binderFiles';
import { downloadBinderImages } from '@/sync/binderImages';
import { syncCatalog, type OnProgress, type SyncDeps } from '@/sync/catalog';
import { syncAll } from '@/sync/syncAll';
import { ClockContext } from '@/ui/ClockContext';
import { SyncContext } from '@/ui/SyncContext';

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
 * Branche `CatalogGate` sur l'app. C'est ici, à la racine, que `fetch` et
 * l'horloge sont créés puis injectés dans `sync/` (synchronisation, images du
 * classeur).
 *
 * - Catalogue absent : premier téléchargement, piloté par `CatalogGate`.
 * - Catalogue présent : toutes les sources (`syncAll`) sont vérifiées à
 *   l'ouverture, à chaque retour dans l'app et au tirer-pour-rafraîchir. Les
 *   échecs sont notés dans `source_state` et réessayés la fois suivante.
 */
export function AppCatalogGate({ children }: { children: ReactNode }) {
  const db = useDatabase();
  const deps = useMemo<SyncDeps>(
    () => ({ db, fetch: globalThis.fetch, now: () => new Date() }),
    [db],
  );
  // Lu une seule fois au démarrage : l'écran n'a pas à réagir à ce changement,
  // c'est `CatalogGate` qui passe à l'app à la fin du premier téléchargement.
  const [hadCatalogAtStart] = useState(() => hasCatalog(db));
  const catalogReady = useRef(hadCatalogAtStart);

  // Une seule synchronisation à la fois. Une vérification ordinaire demandée
  // pendant qu'elle tourne la rejoint ; un tirer-pour-rafraîchir attend sa fin
  // puis relance une mise à jour forcée.
  // Les échecs sont déjà notés dans source_state (écran « État des sources », #40).
  const running = useRef<Promise<void> | null>(null);
  const synchronize = useCallback(
    function synchronize(refresh: boolean): Promise<void> {
      if (!catalogReady.current) return Promise.resolve();
      if (running.current) {
        return refresh ? running.current.then(() => synchronize(true)) : running.current;
      }
      running.current = syncAll(deps, { refresh })
        .then(() => undefined)
        .finally(() => {
          running.current = null;
        });
      return running.current;
    },
    [deps],
  );

  useEffect(() => {
    void synchronize(false);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void synchronize(false);
    });
    return () => subscription.remove();
  }, [synchronize]);

  const sync = useMemo(
    () => ({
      refresh: () => synchronize(true),
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
      // Les prix suivent en arrière-plan : seul le Catalogue est bloquant (spec § 6).
      void synchronize(false);
    },
    [deps, synchronize],
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
