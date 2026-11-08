/** Tris des grilles de Versions (spec § 2.1). Les tris par prix arrivent avec #28 et #32. */
import type { CatalogEntry } from './catalogEntry';

export type CatalogSort = 'number' | 'name';

export const DEFAULT_CATALOG_SORT: CatalogSort = 'number';

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const comparators: Record<CatalogSort, (a: CatalogEntry, b: CatalogEntry) => number> = {
  number: (a, b) =>
    a.expansionRank - b.expansionRank ||
    byText(a.expansionCode, b.expansionCode) ||
    byText(a.collectorNumber, b.collectorNumber) ||
    byText(a.printingCode, b.printingCode),
  name: (a, b) =>
    a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) ||
    byText(a.printingCode, b.printingCode),
};

/** Une copie triée ; le Code de version départage toujours, pour un ordre stable. */
export function sortCatalog(entries: CatalogEntry[], sort: CatalogSort): CatalogEntry[] {
  return [...entries].sort(comparators[sort]);
}
