import { createContext, useContext } from 'react';

import type { ResyncMode, SyncReport } from '@/sync/syncAll';

type SyncControls = {
  /** Tirer-pour-rafraîchir : met à jour toutes les sources sans attendre. */
  refresh: () => Promise<void>;
  /**
   * « Tout resynchroniser » (`resync`) ou « Reconstruire le catalogue »
   * (`rebuild`) : rend les étapes qui ont échoué.
   */
  resynchronize: (mode: ResyncMode) => Promise<SyncReport>;
  /**
   * Télécharge les grandes images du classeur absentes du téléphone, en
   * annonçant la progression ; rend les adresses des images indisponibles.
   */
  downloadBinderImages: (
    urls: readonly string[],
    onProgress: (done: number, total: number) => void,
  ) => Promise<Set<string>>;
};

export const SyncContext = createContext<SyncControls>({
  refresh: async () => {},
  resynchronize: () => Promise.resolve({ failures: [] }),
  downloadBinderImages: async (urls) => new Set(urls),
});

/** Les commandes de synchronisation, fournies par `AppCatalogGate`. */
export function useSync(): SyncControls {
  return useContext(SyncContext);
}
