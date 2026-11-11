/** Tris des grilles de Versions (spec § 2.1). Les tris par Variation de prix arrivent avec #32. */
import type { CatalogEntry } from './catalogEntry';

export type CatalogSort = 'number' | 'name' | 'priceAsc' | 'priceDesc';

export const DEFAULT_CATALOG_SORT: CatalogSort = 'number';

/** Comparaison par code (numéros, Codes de version), sans règles de langue. */
function byText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Par prix dans l'ordre `direction` (1 croissant, -1 décroissant) ; les prix absents en dernier. */
function byPrice(direction: 1 | -1) {
  return (a: CatalogEntry, b: CatalogEntry): number => {
    if (a.price === null || b.price === null) {
      return Number(a.price === null) - Number(b.price === null);
    }
    return direction * (a.price - b.price);
  };
}

const comparators: Record<CatalogSort, (a: CatalogEntry, b: CatalogEntry) => number> = {
  number: (a, b) =>
    a.expansionRank - b.expansionRank ||
    byText(a.expansionCode, b.expansionCode) ||
    byText(a.collectorNumber, b.collectorNumber) ||
    byText(a.printingCode, b.printingCode),
  name: (a, b) =>
    a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) ||
    byText(a.printingCode, b.printingCode),
  priceAsc: (a, b) => byPrice(1)(a, b) || byText(a.printingCode, b.printingCode),
  priceDesc: (a, b) => byPrice(-1)(a, b) || byText(a.printingCode, b.printingCode),
};

/** Une copie triée ; le Code de version départage toujours, pour un ordre stable. */
export function sortCatalog(entries: CatalogEntry[], sort: CatalogSort): CatalogEntry[] {
  return [...entries].sort(comparators[sort]);
}
