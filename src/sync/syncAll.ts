/**
 * Met à jour toutes les sources, dans l'ordre (les prix se rattachent au
 * Catalogue, les taux couvrent l'historique de prix). Chaque source est indépendante (spec § 5) : une panne est notée
 * dans `source_state` et n'empêche pas les suivantes.
 */
import { syncCatalog, type SyncDeps } from './catalog';
import { syncExchangeRates } from './exchangeRates';
import { syncTcgplayerPrices } from './prices';

export type SyncReport = {
  failures: { source: 'catalog' | 'prices' | 'exchangeRates'; error: unknown }[];
};

export async function syncAll(
  deps: SyncDeps,
  /** `refresh` : tirer-pour-rafraîchir, qui force la mise à jour. */
  { refresh = false }: { refresh?: boolean } = {},
): Promise<SyncReport> {
  const steps = [
    { source: 'catalog' as const, run: () => syncCatalog(deps, { refresh }) },
    { source: 'prices' as const, run: () => syncTcgplayerPrices(deps, { refresh }) },
    // Après les prix : l'historique à couvrir part du plus ancien Relevé de prix.
    { source: 'exchangeRates' as const, run: () => syncExchangeRates(deps) },
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
