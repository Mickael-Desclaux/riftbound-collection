/**
 * Ouvrir l'onglet Catalogue filtré depuis un autre onglet (spec § 2.3 : une
 * ligne de Complétion ouvre le Catalogue sur l'Extension et « Manquantes »).
 *
 * La demande passe par un contexte plutôt que par l'URL : naviguer vers
 * `/catalog` empilerait une seconde grille Catalogue au-dessus d'une fiche
 * restée ouverte. On saute donc à l'onglet, et la grille existante applique
 * les filtres puis referme les fiches de sa pile.
 */
import { useNavigation } from 'expo-router';
import { StackActions, type NavigationProp } from 'expo-router/react-navigation';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { CatalogFilters } from '@/domain/catalogFilters';

type CatalogRequestState = {
  /** Les derniers filtres demandés ; chaque demande est un objet neuf. */
  request: CatalogFilters | null;
  setRequest: (filters: CatalogFilters) => void;
};

const CatalogRequestContext = createContext<CatalogRequestState | null>(null);

/** À placer autour des onglets, qui partagent ainsi la demande. */
export function CatalogRequestProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [request, setRequest] = useState<CatalogFilters | null>(null);
  const value = useMemo(() => ({ request, setRequest }), [request]);
  return <CatalogRequestContext value={value}>{children}</CatalogRequestContext>;
}

function useCatalogRequestState(): CatalogRequestState {
  const state = use(CatalogRequestContext);
  if (!state) throw new Error('Aucun CatalogRequestProvider autour des onglets.');
  return state;
}

/** Ouvre l'onglet Catalogue ; avec `filters`, sa grille les applique. */
export function useOpenCatalog(): (filters?: CatalogFilters) => void {
  const { setRequest } = useCatalogRequestState();
  const tabs = useNavigation<NavigationProp<{ catalog: undefined }>>('/(tabs)');
  return useCallback(
    (filters) => {
      // Une copie : deux touchers sur la même ligne font deux demandes.
      if (filters) setRequest({ ...filters });
      tabs.navigate('catalog');
    },
    [setRequest, tabs],
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
