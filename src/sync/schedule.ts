/** Règles de planification communes à toutes les sources (spec § 5). */
import type { AppDatabase } from '@/data/database';
import type { SourceId } from '@/data/schema';
import { recordSourceFailure, recordSourceSuccess, type SourceState } from '@/data/sourceState';

export const HOUR = 60 * 60 * 1000;

/** Vrai aussi si la dernière réussite est datée dans le futur (horloge qui a reculé). */
export function isOlderThan(state: SourceState | undefined, maxAge: number, at: Date): boolean {
  if (!state?.lastSuccessAt) return true;
  const age = at.getTime() - Date.parse(state.lastSuccessAt);
  return age < 0 || age >= maxAge;
}

/** La dernière tentative a échoué : on réessaie sans attendre. */
export function hasPendingError(state: SourceState | undefined): boolean {
  if (!state?.lastErrorAt) return false;
  return !state.lastSuccessAt || Date.parse(state.lastErrorAt) >= Date.parse(state.lastSuccessAt);
}

/** Exécute une étape et note son échec dans `source_state` (sa réussite reste à noter). */
export async function failuresRecorded<T>(
  db: AppDatabase,
  source: SourceId,
  at: Date,
  step: () => Promise<T>,
): Promise<T> {
  try {
    return await step();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    recordSourceFailure(db, source, at.toISOString(), message);
    throw error;
  }
}

/** Exécute une étape et note sa réussite ou son échec dans `source_state`. */
export async function recorded<T>(
  db: AppDatabase,
  source: SourceId,
  at: Date,
  step: () => Promise<T>,
): Promise<T> {
  const result = await failuresRecorded(db, source, at, step);
  recordSourceSuccess(db, source, at.toISOString());
  return result;
}
