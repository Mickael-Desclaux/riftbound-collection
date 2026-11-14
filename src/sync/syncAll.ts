/**
 * Met à jour toutes les sources, dans l'ordre : les prix se rattachent au
 * Catalogue (Cardmarket par la correspondance OpenRift), les taux couvrent
 * l'historique de prix. Chaque source est
 * indépendante (spec § 5) : une panne est notée dans `source_state` et
 * n'empêche pas les suivantes.
 */
import { forgetAllLastModified } from '@/data/sourceState';

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
 *   de l'appareil est d'abord effacé (prix du jour et correspondance compris).
 */
export type SyncMode = 'auto' | 'refresh' | 'resync' | 'rebuild';

export type SyncReport = { failures: { source: SyncStep; error: unknown }[] };

export async function syncAll(
  deps: SyncDeps,
  { mode = 'auto' }: { mode?: SyncMode } = {},
): Promise<SyncReport> {
  const refresh = mode !== 'auto';
  const full = mode === 'resync' || mode === 'rebuild';
  if (full) forgetAllLastModified(deps.db);
  const steps: { source: SyncStep; run: () => Promise<unknown> }[] = [
    {
      source: 'catalog',
      run: () => syncCatalog(deps, { refresh, redownload: full, rebuild: mode === 'rebuild' }),
    },
    // Après le Catalogue : la correspondance relie ses Versions à Cardmarket.
    { source: 'cardmarketLinks', run: () => syncCardmarketLinks(deps) },
    { source: 'tcgplayerPrices', run: () => syncTcgplayerPrices(deps, { refresh }) },
    { source: 'cardmarketPrices', run: () => syncCardmarketPrices(deps, { refresh }) },
    // Après les prix : l'historique à couvrir part du plus ancien Relevé de prix.
    { source: 'exchangeRates', run: () => syncExchangeRates(deps, { refresh: full }) },
  ];
  const failures: SyncReport['failures'] = [];
  // L'une après l'autre, volontairement : chaque étape s'appuie sur la précédente.
  for (const step of steps) {
    try {
      await step.run();
    } catch (error) {
      failures.push({ source: step.source, error });
    }
  }
  return { failures };
}
