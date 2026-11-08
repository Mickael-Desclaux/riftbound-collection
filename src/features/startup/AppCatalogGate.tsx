import { addNetworkStateListener } from 'expo-network';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { storedExpansions } from '@/data/catalog';
import { useDatabase } from '@/data/DatabaseProvider';
import { syncCatalog, type SyncDeps } from '@/sync/catalog';

import { CatalogGate } from './CatalogGate';

function subscribeToOnline(listener: () => void): () => void {
  const subscription = addNetworkStateListener(({ isConnected, isInternetReachable }) => {
    if (isInternetReachable ?? isConnected) listener();
  });
  return () => subscription.remove();
}

/**
 * Branche `CatalogGate` sur l'app : premier téléchargement si le Catalogue
 * manque, puis vérification à l'ouverture et à chaque retour dans l'app
 * (les échecs sont notés dans `source_state` et réessayés la fois suivante).
 */
export function AppCatalogGate({ children }: { children: ReactNode }) {
  const db = useDatabase();
  const deps = useMemo<SyncDeps>(
    () => ({ db, fetch: globalThis.fetch, now: () => new Date() }),
    [db],
  );
  const [hasCatalog] = useState(() => storedExpansions(db).length > 0);
  const inFlight = useRef<Promise<unknown> | null>(null);

  const runOnce = useCallback((run: () => Promise<unknown>) => {
    inFlight.current ??= run().finally(() => {
      inFlight.current = null;
    });
    return inFlight.current;
  }, []);

  useEffect(() => {
    const refresh = () => {
      runOnce(() => syncCatalog(deps)).catch(() => {
        // Déjà noté dans source_state ; l'écran « État des sources » (#40) l'affichera.
      });
    };
    if (hasCatalog) refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [deps, hasCatalog, runOnce]);

  const runFirstSync = useCallback(
    (onProgress: (received: number, total: number) => void) =>
      runOnce(() => syncCatalog(deps, { onProgress })),
    [deps, runOnce],
  );

  return (
    <CatalogGate
      hasCatalog={hasCatalog}
      runFirstSync={runFirstSync}
      subscribeToOnline={subscribeToOnline}
    >
      {children}
    </CatalogGate>
  );
}
