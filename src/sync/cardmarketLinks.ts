/**
 * Correspondance OpenRift `tcgId` → `idProduct` Cardmarket (spec § 5) :
 * retéléchargée à chaque nouveau Catalogue. Si OpenRift est indisponible, la
 * dernière correspondance est gardée et un nouvel essai a lieu au prochain appel.
 */
import { applyCardmarketLinks, hasCatalog } from '@/data/catalog';
import { forgetLastModified, getSourceState, type SourceState } from '@/data/sourceState';
import { fetchCardmarketLinks } from '@/sources/openrift/links';
import { hasPendingError } from '@/domain/sourceStatus';

import type { SyncDeps } from './catalog';
import { recorded } from './schedule';

/** `skipped` : déjà à jour pour ce Catalogue ; `refreshed` : correspondance enregistrée. */
export type LinksSyncOutcome = 'skipped' | 'refreshed';

export async function syncCardmarketLinks({ db, fetch, now }: SyncDeps): Promise<LinksSyncOutcome> {
  if (!hasCatalog(db)) return 'skipped';
  const state = getSourceState(db, 'openrift-links');
  if (isUpToDate(state, getSourceState(db, 'rifthunt-catalog'))) return 'skipped';

  return recorded(db, 'openrift-links', now(), async () => {
    applyCardmarketLinks(db, await fetchCardmarketLinks(fetch));
    // Des Versions viennent peut-être d'être reliées : le prochain
    // téléchargement des prix Cardmarket sera complet.
    forgetLastModified(db, 'cardmarket-prices');
    return 'refreshed' as const;
  });
}

/** Vrai si la correspondance a réussi depuis le dernier Catalogue, sans échec depuis. */
function isUpToDate(links: SourceState | undefined, catalog: SourceState | undefined): boolean {
  if (!links?.lastSuccessAt || hasPendingError(links)) return false;
  return (
    !catalog?.lastSuccessAt || Date.parse(links.lastSuccessAt) >= Date.parse(catalog.lastSuccessAt)
  );
}
