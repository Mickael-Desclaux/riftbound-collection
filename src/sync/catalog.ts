/**
 * Synchronisation du Catalogue RiftHunt (spec § 5) :
 * - `/sets` est consulté une fois par jour ;
 * - le Catalogue complet est retéléchargé si une Extension apparaît, disparaît
 *   ou change de `card_count`, et sinon une fois par semaine.
 * Une tentative échouée est refaite au prochain appel, sans attendre.
 */
import { hasCatalog as catalogIsStored, replaceCatalog, storedExpansions } from '@/data/catalog';
import type { AppDatabase } from '@/data/database';
import { forgetLastModified, getSourceState } from '@/data/sourceState';
import type { Expansion } from '@/domain/catalog';
import { SourceError, type Fetch } from '@/sources/http';
import { fetchCatalog, fetchExpansions, type OnProgress } from '@/sources/rifthunt/rifthunt';

import { hasPendingError, HOUR, isOlderThan, recorded } from './schedule';

export { SourceError } from '@/sources/http';
export type { OnProgress } from '@/sources/rifthunt/rifthunt';

export type SyncDeps = {
  db: AppDatabase;
  fetch: Fetch;
  now: () => Date;
};

/** `skipped` : rien à vérifier ; `unchanged` : `/sets` vérifié, Catalogue à jour. */
export type CatalogSyncOutcome = 'skipped' | 'unchanged' | 'refreshed';

const SETS_MAX_AGE = 24 * HOUR;
const CATALOG_MAX_AGE = 7 * 24 * HOUR;

export async function syncCatalog(
  { db, fetch, now }: SyncDeps,
  options: {
    /** Retélécharge tout le Catalogue, même si rien n'a changé. */
    redownload?: boolean;
    /** L'utilisateur demande une mise à jour (tirer-pour-rafraîchir) : `/sets` est vérifié tout de suite. */
    refresh?: boolean;
    onProgress?: OnProgress;
  } = {},
): Promise<CatalogSyncOutcome> {
  const at = now();
  const hasCatalog = catalogIsStored(db);
  const catalogState = getSourceState(db, 'rifthunt-catalog');
  const catalogRetry = hasPendingError(catalogState);

  const mustCheck =
    options.redownload ||
    options.refresh ||
    !hasCatalog ||
    catalogRetry ||
    isOlderThan(getSourceState(db, 'rifthunt-sets'), SETS_MAX_AGE, at);
  if (!mustCheck) return 'skipped';

  const expansions = await recorded(db, 'rifthunt-sets', at, () => fetchExpansions(fetch));

  const mustDownload =
    options.redownload ||
    !hasCatalog ||
    catalogRetry ||
    expansionsChanged(storedExpansions(db), expansions) ||
    isOlderThan(catalogState, CATALOG_MAX_AGE, at);
  if (!mustDownload) return 'unchanged';

  await recorded(db, 'rifthunt-catalog', at, async () => {
    const { cards, printings } = await fetchCatalog(fetch, options.onProgress);
    const known = new Set(expansions.map((e) => e.code));
    const unknown = [...new Set(printings.map((p) => p.expansionCode))].filter(
      (c) => !known.has(c),
    );
    if (unknown.length > 0) {
      throw new SourceError(
        'format',
        `Le catalogue RiftHunt cite une Extension absente de /sets : ${unknown.join(', ')}.`,
      );
    }
    replaceCatalog(db, { expansions, cards, printings });
    // De nouvelles Versions attendent peut-être leur prix : le prochain
    // téléchargement des prix sera complet, même si leur fichier n'a pas changé.
    forgetLastModified(db, 'rifthunt-prices');
  });
  return 'refreshed';
}

type ExpansionSize = Pick<Expansion, 'code' | 'cardCount'>;

function expansionsChanged(stored: ExpansionSize[], latest: Expansion[]): boolean {
  const key = (e: ExpansionSize) => `${e.code}:${e.cardCount}`;
  const storedKeys = new Set(stored.map(key));
  return stored.length !== latest.length || latest.some((e) => !storedKeys.has(key(e)));
}
