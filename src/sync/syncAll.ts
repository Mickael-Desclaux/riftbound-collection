/**
 * Met à jour toutes les sources, dans l'ordre (les prix se rattachent au
 * Catalogue). Chaque source est indépendante (spec § 5) : une panne est notée
 * dans `source_state` et n'empêche pas les suivantes.
 */
import { syncCatalog, type SyncDeps } from './catalog';
import { syncTcgplayerPrices } from './prices';

export type SyncReport = { failures: { source: 'catalog' | 'prices'; error: unknown }[] };

export async function syncAll(
  deps: SyncDeps,
  /** `refresh` : tirer-pour-rafraîchir, qui force la mise à jour. */
  { refresh = false }: { refresh?: boolean } = {},
): Promise<SyncReport> {
  const steps = [
    { source: 'catalog' as const, run: () => syncCatalog(deps, { checkNow: refresh }) },
    { source: 'prices' as const, run: () => syncTcgplayerPrices(deps, { force: refresh }) },
  ];
  const failures: SyncReport['failures'] = [];
  for (const step of steps) {
    try {
      await step.run();
    } catch (error) {
      failures.push({ source: step.source, error });
    }
  }
  return { failures };
}
