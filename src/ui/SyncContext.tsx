import { createContext, useContext } from 'react';

type SyncControls = {
  /** Tirer-pour-rafraîchir : met à jour toutes les sources sans attendre. */
  refresh: () => Promise<void>;
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
  downloadBinderImages: async (urls) => new Set(urls),
});

/** Les commandes de synchronisation, fournies par `AppCatalogGate`. */
export function useSync(): SyncControls {
  return useContext(SyncContext);
}
