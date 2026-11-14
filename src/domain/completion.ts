/** Complétion (spec § 2.3) : la part des Versions distinctes d'une Extension que l'on possède. */
import type { CatalogEntry } from './catalogEntry';

/** « ORIGINS — 54 / 352 » : Versions distinctes possédées sur le total de l'Extension. */
export type ExpansionCompletion = { expansionCode: string; owned: number; total: number };

/**
 * La Complétion de chaque Extension principale (les promos en sont écartées),
 * dans l'ordre de sortie. Les Versions inconnues n'appartiennent plus au
 * Catalogue : elles ne comptent pas.
 */
export function completion(entries: readonly CatalogEntry[]): ExpansionCompletion[] {
  const byExpansion = new Map<string, ExpansionCompletion & { rank: number }>();
  for (const entry of entries) {
    if (entry.isPromo || !entry.inCatalog) continue;
    const known = byExpansion.get(entry.expansionCode) ?? {
      expansionCode: entry.expansionCode,
      owned: 0,
      total: 0,
      rank: entry.expansionRank,
    };
    known.total += 1;
    if (entry.ownedQuantity > 0) known.owned += 1;
    byExpansion.set(entry.expansionCode, known);
  }
  return [...byExpansion.values()]
    .sort((a, b) => a.rank - b.rank)
    .map(({ expansionCode, owned, total }) => ({ expansionCode, owned, total }));
}

/** Le pourcentage entier, arrondi vers le bas : 100 % seulement quand tout est possédé. */
export function completionPercent({ owned, total }: ExpansionCompletion): number {
  return total === 0 ? 0 : Math.floor((owned * 100) / total);
}
