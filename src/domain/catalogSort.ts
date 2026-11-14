/** Tris des grilles de Versions (spec § 2.1). */
import type { CatalogEntry } from './catalogEntry';

export type CatalogSort =
  | 'number'
  | 'name'
  | 'priceAsc'
  | 'priceDesc'
  | 'change7dAsc'
  | 'change7dDesc'
  | 'change30dAsc'
  | 'change30dDesc';

export const DEFAULT_CATALOG_SORT: CatalogSort = 'number';

/** Comparaison par code (numéros, Codes de version), sans règles de langue. */
function byText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

type NumericField = 'price' | 'priceChange7d' | 'priceChange30d';

/**
 * Par `field` dans l'ordre `direction` (1 croissant, -1 décroissant) ; les
 * valeurs absentes (prix inconnu, pas assez d'historique) en dernier, puis le
 * Code de version pour un ordre stable.
 */
function byNumber(field: NumericField, direction: 1 | -1) {
  return (a: CatalogEntry, b: CatalogEntry): number => {
    const x = a[field];
    const y = b[field];
    const order =
      x === null || y === null ? Number(x === null) - Number(y === null) : direction * (x - y);
    return order || byText(a.printingCode, b.printingCode);
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
  priceAsc: byNumber('price', 1),
  priceDesc: byNumber('price', -1),
  change7dAsc: byNumber('priceChange7d', 1),
  change7dDesc: byNumber('priceChange7d', -1),
  change30dAsc: byNumber('priceChange30d', 1),
  change30dDesc: byNumber('priceChange30d', -1),
};

/** Une copie triée ; le Code de version départage toujours, pour un ordre stable. */
export function sortCatalog(entries: CatalogEntry[], sort: CatalogSort): CatalogEntry[] {
  return [...entries].sort(comparators[sort]);
}
