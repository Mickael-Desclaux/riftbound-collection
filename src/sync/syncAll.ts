/**
 * Met à jour toutes les sources, dans l'ordre : les prix se rattachent au
 * Catalogue (Cardmarket par la correspondance OpenRift), les taux couvrent
 * l'historique de prix. Chaque source est
 * indépendante (spec § 5) : une panne est notée dans `source_state` et
 * n'empêche pas les suivantes.
 */
import { syncCardmarketLinks } from './cardmarketLinks';
import { syncCatalog, type SyncDeps } from './catalog';
import { syncExchangeRates } from './exchangeRates';
import { syncCardmarketPrices, syncTcgplayerPrices } from './prices';

type Step =
  'catalog' | 'cardmarketLinks' | 'tcgplayerPrices' | 'cardmarketPrices' | 'exchangeRates';

export type SyncReport = { failures: { source: Step; error: unknown }[] };

export async function syncAll(
  deps: SyncDeps,
  /** `refresh` : tirer-pour-rafraîchir, qui force la mise à jour. */
  { refresh = false }: { refresh?: boolean } = {},
): Promise<SyncReport> {
  const steps: { source: Step; run: () => Promise<unknown> }[] = [
    { source: 'catalog', run: () => syncCatalog(deps, { refresh }) },
    // Après le Catalogue : la correspondance relie ses Versions à Cardmarket.
    { source: 'cardmarketLinks', run: () => syncCardmarketLinks(deps) },
    { source: 'tcgplayerPrices', run: () => syncTcgplayerPrices(deps, { refresh }) },
    { source: 'cardmarketPrices', run: () => syncCardmarketPrices(deps, { refresh }) },
    // Après les prix : l'historique à couvrir part du plus ancien Relevé de prix.
    { source: 'exchangeRates', run: () => syncExchangeRates(deps) },
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
