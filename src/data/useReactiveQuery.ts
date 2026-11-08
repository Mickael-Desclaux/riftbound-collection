import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect, useState, type DependencyList } from 'react';

/** Délai pendant lequel les changements sont regroupés avant de relire. */
const DEBOUNCE_MS = 100;

/**
 * Lit la base tout de suite, puis relit quand l'une des `tables` change.
 *
 * Remplace `useLiveQuery` de Drizzle pour les grilles, pour deux raisons :
 * - la première lecture est synchrone : pas d'état « chargement » ni de
 *   compteur à 0 au premier affichage ;
 * - les changements sont regroupés : une synchronisation qui réécrit 1 725
 *   Versions provoque une relecture, pas 1 725 ; et on peut écouter plusieurs
 *   tables (une jointure dépend de chacune).
 *
 * `read` doit être synchrone (`.all()`, `.get()`) et ne dépendre que de `deps`.
 */
export function useReactiveQuery<T>(read: () => T, deps: DependencyList, tables: string[]): T {
  const [state, setState] = useState(() => ({ deps, stale: false, value: read() }));
  const tablesKey = tables.join(',');

  useEffect(() => {
    const watched = new Set(tablesKey.split(','));
    let timer: ReturnType<typeof setTimeout> | undefined;
    const subscription = addDatabaseChangeListener(({ tableName }) => {
      if (!watched.has(tableName)) return;
      clearTimeout(timer);
      timer = setTimeout(() => setState((s) => ({ ...s, stale: true })), DEBOUNCE_MS);
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [tablesKey]);

  // État dérivé (https://react.dev/reference/react/useState#storing-information-from-previous-renders) :
  // on relit pendant le rendu si les dépendances ont changé ou si une table a changé.
  if (state.stale || !sameDeps(state.deps, deps)) {
    const next = { deps, stale: false, value: read() };
    setState(next);
    return next.value;
  }
  return state.value;
}

function sameDeps(a: DependencyList, b: DependencyList): boolean {
  return a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
}
