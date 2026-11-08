import { createContext, useContext } from 'react';

type SyncControls = {
  /** Tirer-pour-rafraîchir : met à jour toutes les sources sans attendre. */
  refresh: () => Promise<void>;
};

export const SyncContext = createContext<SyncControls>({ refresh: async () => {} });

/** Les commandes de synchronisation, fournies par `AppCatalogGate`. */
export function useSync(): SyncControls {
  return useContext(SyncContext);
}
