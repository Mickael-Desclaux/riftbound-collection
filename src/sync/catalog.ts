/**
 * Synchronisation du Catalogue RiftHunt (spec § 5) :
 * - `/sets` est consulté une fois par jour ;
 * - le Catalogue complet est retéléchargé si une Extension apparaît, disparaît
 *   ou change de `card_count`, et sinon une fois par semaine.
 * Une tentative échouée est refaite au prochain appel, sans attendre.
 */
import { replaceCatalog, storedExpansions } from '@/data/catalog';
import type { AppDatabase } from '@/data/database';
import type { SourceId } from '@/data/schema';
import {
  getSourceState,
  recordSourceFailure,
  recordSourceSuccess,
  type SourceState,
} from '@/data/sourceState';
import type { Expansion } from '@/domain/catalog';
import { fetchCatalog, fetchExpansions } from '@/sources/rifthunt/rifthunt';

export type SyncDeps = {
  db: AppDatabase;
  fetch: typeof globalThis.fetch;
  now: () => Date;
};

/** `skipped` : rien à vérifier ; `unchanged` : `/sets` vérifié, Catalogue à jour. */
export type CatalogSyncOutcome = 'skipped' | 'unchanged' | 'refreshed';

const HOUR = 60 * 60 * 1000;
const SETS_MAX_AGE = 24 * HOUR;
const CATALOG_MAX_AGE = 7 * 24 * HOUR;

export async function syncCatalog(
  { db, fetch, now }: SyncDeps,
  options: { force?: boolean; onProgress?: (received: number, total: number) => void } = {},
): Promise<CatalogSyncOutcome> {
  const at = now();
  const hasCatalog = storedExpansions(db).length > 0;
  const catalogState = getSourceState(db, 'rifthunt-catalog');
  const catalogRetry = hasPendingError(catalogState);

  const mustCheck =
    options.force ||
    !hasCatalog ||
    catalogRetry ||
    isOlderThan(getSourceState(db, 'rifthunt-sets'), SETS_MAX_AGE, at);
  if (!mustCheck) return 'skipped';

  const expansions = await recorded(db, 'rifthunt-sets', at, () => fetchExpansions(fetch));

  const mustDownload =
    options.force ||
    !hasCatalog ||
    catalogRetry ||
    expansionsChanged(storedExpansions(db), expansions) ||
    isOlderThan(catalogState, CATALOG_MAX_AGE, at);
  if (!mustDownload) return 'unchanged';

  await recorded(db, 'rifthunt-catalog', at, async () => {
    const { cards, printings } = await fetchCatalog(fetch, options.onProgress);
    replaceCatalog(db, { expansions, cards, printings });
  });
  return 'refreshed';
}

/** Exécute une étape et note sa réussite ou son échec dans `source_state`. */
async function recorded<T>(
  db: AppDatabase,
  source: SourceId,
  at: Date,
  step: () => Promise<T>,
): Promise<T> {
  try {
    const result = await step();
    recordSourceSuccess(db, source, at.toISOString());
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    recordSourceFailure(db, source, at.toISOString(), message);
    throw error;
  }
}

function isOlderThan(state: SourceState | undefined, maxAge: number, at: Date): boolean {
  if (!state?.lastSuccessAt) return true;
  return at.getTime() - Date.parse(state.lastSuccessAt) >= maxAge;
}

function hasPendingError(state: SourceState | undefined): boolean {
  if (!state?.lastErrorAt) return false;
  return !state.lastSuccessAt || state.lastErrorAt > state.lastSuccessAt;
}

function expansionsChanged(
  stored: { code: string; cardCount: number }[],
  latest: Expansion[],
): boolean {
  const key = (e: { code: string; cardCount: number }) => `${e.code}:${e.cardCount}`;
  const storedKeys = new Set(stored.map(key));
  return stored.length !== latest.length || latest.some((e) => !storedKeys.has(key(e)));
}
