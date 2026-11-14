/**
 * Ouvrir l'onglet Catalogue filtré depuis un autre onglet (spec § 2.3 : une
 * ligne de Complétion ouvre le Catalogue sur l'Extension et « Manquantes »).
 *
 * La demande passe par un contexte plutôt que par l'URL : naviguer vers
 * `/catalog` empilerait une seconde grille Catalogue au-dessus d'une fiche
 * restée ouverte. On saute donc à l'onglet, et la grille existante applique
 * les filtres puis referme les fiches de sa pile.
 *
 * Le saut d'onglet est fourni par la mise en page des onglets (prop `layout`
 * de `Tabs`, qui reçoit leur navigateur) : il marche ainsi depuis un écran
 * comme depuis un bandeau posé au-dessus des onglets.
 */
import { useNavigation } from 'expo-router';
import { StackActions } from 'expo-router/react-navigation';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { CatalogFilters } from '@/domain/catalogFilters';

type CatalogRequestState = {
  /** Les derniers filtres demandés ; chaque demande est un objet neuf. */
  request: CatalogFilters | null;
  setRequest: (filters: CatalogFilters) => void;
  showCatalogTab: () => void;
};

const CatalogRequestContext = createContext<CatalogRequestState | null>(null);

/** À placer autour des onglets, qui partagent ainsi la demande. */
export function CatalogRequestProvider({
  showCatalogTab,
  children,
}: Readonly<{
  /** Affiche l'onglet Catalogue, sans toucher à sa pile. */
  showCatalogTab: () => void;
  children: ReactNode;
}>) {
  const [request, setRequest] = useState<CatalogFilters | null>(null);
  // La mise en page des onglets en donne une nouvelle à chaque rendu : on garde
  // la dernière, derrière une fonction stable, pour ne pas tout re-rendre.
  const latestShowCatalogTab = useRef(showCatalogTab);
  useEffect(() => {
    latestShowCatalogTab.current = showCatalogTab;
  });
  const stableShowCatalogTab = useCallback(() => latestShowCatalogTab.current(), []);
  const value = useMemo(
    () => ({ request, setRequest, showCatalogTab: stableShowCatalogTab }),
    [request, stableShowCatalogTab],
  );
  return <CatalogRequestContext value={value}>{children}</CatalogRequestContext>;
}

function useCatalogRequestState(): CatalogRequestState {
  const state = use(CatalogRequestContext);
  if (!state) throw new Error('Aucun CatalogRequestProvider autour des onglets.');
  return state;
}

/** Ouvre l'onglet Catalogue ; avec `filters`, sa grille les applique. */
export function useOpenCatalog(): (filters?: CatalogFilters) => void {
  const { setRequest, showCatalogTab } = useCatalogRequestState();
  return useCallback(
    (filters) => {
      // Une copie : deux touchers sur la même ligne font deux demandes.
      if (filters) setRequest({ ...filters });
      showCatalogTab();
    },
    [setRequest, showCatalogTab],
  );
}

/**
 * Pour la grille du Catalogue : les filtres demandés par un autre onglet. À
 * chaque nouvelle demande, les fiches ouvertes par-dessus la grille sont refermées.
 */
export function useCatalogRequest(): CatalogFilters | null {
  const { request } = useCatalogRequestState();
  const navigation = useNavigation();
  useEffect(() => {
    if (request && (navigation.getState()?.index ?? 0) > 0) {
      navigation.dispatch(StackActions.popToTop());
    }
  }, [request, navigation]);
  return request;
}
