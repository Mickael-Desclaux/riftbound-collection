/**
 * Met à jour toutes les sources, dans l'ordre : les prix se rattachent au
 * Catalogue (Cardmarket par la correspondance OpenRift), les taux couvrent
 * l'historique de prix. Chaque source est
 * indépendante (spec § 5) : une panne est notée dans `source_state` et
 * n'empêche pas les suivantes.
 */
import { storedExpansions } from '@/data/catalog';
import { forgetAllLastModified } from '@/data/sourceState';
import { newExpansions, type Expansion } from '@/domain/catalog';

import { syncCardmarketLinks } from './cardmarketLinks';
import { syncCatalog, type SyncDeps } from './catalog';
import { syncExchangeRates } from './exchangeRates';
import { syncCardmarketPrices, syncTcgplayerPrices } from './prices';

export type SyncStep =
  'catalog' | 'cardmarketLinks' | 'tcgplayerPrices' | 'cardmarketPrices' | 'exchangeRates';

/**
 * - `auto` : à l'ouverture et au retour dans l'app, chaque source selon sa fréquence ;
 * - `refresh` : tirer-pour-rafraîchir, toutes les sources sans attendre ;
 * - `resync` : « Tout resynchroniser », tout est retéléchargé, même un fichier inchangé ;
 * - `rebuild` : « Reconstruire le catalogue », comme `resync`, et le Catalogue
 *   de l'appareil est remplacé d'un bloc par celui qui vient d'être téléchargé.
 */
export type SyncMode = 'auto' | 'refresh' | 'resync' | 'rebuild';

/** Les synchronisations lancées depuis les Réglages. */
export type ResyncMode = Extract<SyncMode, 'resync' | 'rebuild'>;

/** Une Extension apparue pendant la synchronisation (spec § 5). */
export type NewExpansion = Pick<Expansion, 'code' | 'name' | 'isPromo'>;

export type SyncReport = {
  failures: { step: SyncStep; error: unknown }[];
  /** Les Extensions apparues dans le Catalogue ; aucune au premier téléchargement. */
  newExpansions: NewExpansion[];
};

export const EMPTY_SYNC_REPORT: SyncReport = { failures: [], newExpansions: [] };

export async function syncAll(
  deps: SyncDeps,
  { mode = 'auto' }: { mode?: SyncMode } = {},
): Promise<SyncReport> {
  const refresh = mode !== 'auto';
  const full = mode === 'resync' || mode === 'rebuild';
  if (full) forgetAllLastModified(deps.db);
  const expansionsBefore = storedExpansions(deps.db);
  const steps: { step: SyncStep; run: () => Promise<unknown> }[] = [
    {
      step: 'catalog',
      run: () => syncCatalog(deps, { refresh, redownload: full, rebuild: mode === 'rebuild' }),
    },
    // Après le Catalogue : la correspondance relie ses Versions à Cardmarket.
    { step: 'cardmarketLinks', run: () => syncCardmarketLinks(deps) },
    { step: 'tcgplayerPrices', run: () => syncTcgplayerPrices(deps, { refresh }) },
    { step: 'cardmarketPrices', run: () => syncCardmarketPrices(deps, { refresh }) },
    // Après les prix : l'historique à couvrir part du plus ancien Relevé de prix.
    { step: 'exchangeRates', run: () => syncExchangeRates(deps, { refresh: full }) },
  ];
  const failures: SyncReport['failures'] = [];
  // L'une après l'autre, volontairement : chaque étape s'appuie sur la précédente.
  for (const step of steps) {
    try {
      await step.run();
    } catch (error) {
      failures.push({ step: step.step, error });
    }
  }
  const appeared = newExpansions(expansionsBefore, storedExpansions(deps.db));
  return {
    failures,
    newExpansions: appeared.map(({ code, name, isPromo }) => ({ code, name, isPromo })),
  };
}
