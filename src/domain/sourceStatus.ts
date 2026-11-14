/** État d'une source externe, d'après sa dernière réussite et sa dernière erreur (spec § 2.6, § 5). */
import type { IsoDateTime } from './dates';

export type SourceOutcomes = {
  lastSuccessAt: IsoDateTime | null;
  lastErrorAt: IsoDateTime | null;
};

/**
 * - `never` : jamais contactée ;
 * - `ok` : la dernière tentative a réussi ;
 * - `failing` : la dernière tentative a échoué (elle sera refaite sans attendre).
 */
export type SourceHealth = 'never' | 'ok' | 'failing';

/** La dernière tentative a échoué : on réessaie sans attendre. */
export function hasPendingError(state: SourceOutcomes | undefined): boolean {
  if (!state?.lastErrorAt) return false;
  return !state.lastSuccessAt || Date.parse(state.lastErrorAt) >= Date.parse(state.lastSuccessAt);
}

export function sourceHealth(state: SourceOutcomes | undefined): SourceHealth {
  if (hasPendingError(state)) return 'failing';
  return state?.lastSuccessAt ? 'ok' : 'never';
}
