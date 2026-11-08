import { addNetworkStateListener } from 'expo-network';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { hasCatalog } from '@/data/catalog';
import { useDatabase } from '@/data/DatabaseProvider';
import { syncCatalog, type OnProgress, type SyncDeps } from '@/sync/catalog';

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
 * l'horloge sont créés puis injectés dans `sync/`.
 *
 * - Catalogue absent : premier téléchargement, piloté par `CatalogGate`.
 * - Catalogue présent : vérification à l'ouverture et à chaque retour dans
 *   l'app. Les échecs sont notés dans `source_state` et réessayés la fois suivante.
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

  useEffect(() => {
    let refreshing = false;
    const refresh = () => {
      if (!catalogReady.current || refreshing) return;
      refreshing = true;
      syncCatalog(deps)
        .catch(() => {
          // Déjà noté dans source_state ; l'écran « État des sources » (#40) l'affichera.
        })
        .finally(() => {
          refreshing = false;
        });
    };
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [deps]);

  const runFirstSync = useCallback(
    async (onProgress: OnProgress) => {
      await syncCatalog(deps, { onProgress });
      catalogReady.current = true;
    },
    [deps],
  );

  return (
    <CatalogGate
      hasCatalog={hadCatalogAtStart}
      runFirstSync={runFirstSync}
      subscribeToOnline={subscribeToOnline}
    >
      {children}
    </CatalogGate>
  );
}
