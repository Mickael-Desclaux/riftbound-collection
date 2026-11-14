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
  | 'change30dDesc'
  /** « Valeur » : quantité possédée × prix, la plus forte d'abord (onglet Collection). */
  | 'valueDesc';

export const DEFAULT_CATALOG_SORT: CatalogSort = 'number';

/** Les tris du Catalogue, dans l'ordre du menu. */
export const CATALOG_SORTS: readonly CatalogSort[] = [
  'number',
  'name',
  'priceAsc',
  'priceDesc',
  'change7dAsc',
  'change7dDesc',
  'change30dAsc',
  'change30dDesc',
];

/** Les tris de la Collection : « Valeur » en tête, puis ceux du Catalogue. */
export const COLLECTION_SORTS: readonly CatalogSort[] = ['valueDesc', ...CATALOG_SORTS];

/** Comparaison par code (numéros, Codes de version), sans règles de langue. */
function byText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Une valeur numérique d'une Version, `null` quand elle manque. */
type NumericValue = (entry: CatalogEntry) => number | null;

const field =
  (name: 'price' | 'priceChange7d' | 'priceChange30d'): NumericValue =>
  (entry) =>
    entry[name];

/** Quantité × prix de la Finition de référence. */
const ownedValue: NumericValue = (entry) =>
  entry.price === null ? null : entry.ownedQuantity * entry.price;

/**
 * Par `valueOf` dans l'ordre `direction` (1 croissant, -1 décroissant) ; les
 * valeurs absentes (prix inconnu, pas assez d'historique) en dernier, puis le
 * Code de version pour un ordre stable.
 */
function byNumber(valueOf: NumericValue, direction: 1 | -1) {
  return (a: CatalogEntry, b: CatalogEntry): number => {
    const x = valueOf(a);
    const y = valueOf(b);
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
  priceAsc: byNumber(field('price'), 1),
  priceDesc: byNumber(field('price'), -1),
  change7dAsc: byNumber(field('priceChange7d'), 1),
  change7dDesc: byNumber(field('priceChange7d'), -1),
  change30dAsc: byNumber(field('priceChange30d'), 1),
  change30dDesc: byNumber(field('priceChange30d'), -1),
  valueDesc: byNumber(ownedValue, -1),
};

/**
 * Une copie triée ; le Code de version départage toujours, pour un ordre
 * stable. Les Versions inconnues vont toujours en fin de liste (spec § 2.3).
 */
export function sortCatalog(entries: CatalogEntry[], sort: CatalogSort): CatalogEntry[] {
  const compare = comparators[sort];
  return [...entries].sort((a, b) => Number(!a.inCatalog) - Number(!b.inCatalog) || compare(a, b));
}
