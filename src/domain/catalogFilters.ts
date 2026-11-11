/** Filtres des grilles de Versions (spec § 2.1), en règles pures. */
import { isPromoExpansion, type PrintingVariant } from './catalog';
import type { CatalogEntry } from './catalogEntry';

/**
 * Ce qui restreint une grille de Versions. Dans un critère, une seule des
 * valeurs choisies suffit ; entre critères, il faut tout. Liste vide = pas de filtre.
 */
export type CatalogFilters = {
  /** Nom de Carte ou Code de version, sans tenir compte de la casse. */
  search: string;
  expansionCodes: string[];
  /** « Afficher les extensions promo » : masquées par défaut. */
  showPromo: boolean;
  rarities: string[];
  variants: PrintingVariant[];
  types: string[];
  domains: string[];
  ownership: Ownership;
  /** Dans la Devise d'affichage. Une borne posée écarte les Versions sans prix. */
  priceRange: PriceRange;
};

/** Fourchette de prix, bornes comprises ; `null` : pas de borne. */
export type PriceRange = { min: number | null; max: number | null };

const NO_PRICE_RANGE: PriceRange = { min: null, max: null };

function hasPriceRange({ min, max }: PriceRange): boolean {
  return min !== null || max !== null;
}

function matchesPriceRange(price: number | null, range: PriceRange): boolean {
  if (!hasPriceRange(range)) return true;
  if (price === null) return false;
  return (range.min === null || price >= range.min) && (range.max === null || price <= range.max);
}

/** Possédées / manquantes : selon la quantité dans la Collection. */
export type Ownership = 'all' | 'owned' | 'missing';

export const DEFAULT_CATALOG_FILTERS: CatalogFilters = {
  search: '',
  expansionCodes: [],
  showPromo: false,
  rarities: [],
  variants: [],
  types: [],
  domains: [],
  ownership: 'all',
  priceRange: NO_PRICE_RANGE,
};

/** Vrai si aucune valeur n'est choisie, ou si `value` en fait partie. */
function allows<T>(chosen: T[], value: T): boolean {
  return chosen.length === 0 || chosen.includes(value);
}

/**
 * Forme comparable d'un texte de recherche : minuscules, sans accents, une seule
 * sorte d'apostrophe (le clavier tape souvent ’ là où les noms ont '), espaces réduits.
 */
function normalized(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

function matchesOwnership(entry: CatalogEntry, ownership: Ownership): boolean {
  if (ownership === 'owned') return entry.ownedQuantity > 0;
  if (ownership === 'missing') return entry.ownedQuantity === 0;
  return true;
}

function matches(entry: CatalogEntry, filters: CatalogFilters, search: string): boolean {
  return (
    (search === '' ||
      normalized(entry.name).includes(search) ||
      entry.printingCode.toLowerCase().includes(search)) &&
    matchesOwnership(entry, filters.ownership) &&
    matchesPriceRange(entry.price, filters.priceRange) &&
    (filters.showPromo || !entry.isPromo) &&
    allows(filters.expansionCodes, entry.expansionCode) &&
    allows(filters.rarities, entry.rarity) &&
    allows(filters.variants, entry.variant) &&
    allows(filters.types, entry.type) &&
    (filters.domains.length === 0 || entry.domains.some((d) => filters.domains.includes(d)))
  );
}

/** Les Versions qui correspondent aux filtres, dans leur ordre d'origine. */
export function filterCatalog(entries: CatalogEntry[], filters: CatalogFilters): CatalogEntry[] {
  const search = normalized(filters.search);
  return entries.filter((entry) => matches(entry, filters, search));
}

/** Un filtre actif, affiché comme une puce retirable sous l'en-tête. */
export type ActiveFilter =
  | { criterion: 'expansion' | 'rarity' | 'type' | 'domain'; value: string }
  | { criterion: 'variant'; value: PrintingVariant }
  | { criterion: 'promo'; value: 'shown' }
  | { criterion: 'ownership'; value: Exclude<Ownership, 'all'> }
  | { criterion: 'price'; value: PriceRange };

/** Les filtres actifs, critère par critère (la recherche a son propre champ). */
export function activeFilters(filters: CatalogFilters): ActiveFilter[] {
  return [
    ...filters.expansionCodes.map((value) => ({ criterion: 'expansion' as const, value })),
    ...(filters.showPromo ? [{ criterion: 'promo' as const, value: 'shown' as const }] : []),
    ...filters.rarities.map((value) => ({ criterion: 'rarity' as const, value })),
    ...filters.variants.map((value) => ({ criterion: 'variant' as const, value })),
    ...filters.types.map((value) => ({ criterion: 'type' as const, value })),
    ...filters.domains.map((value) => ({ criterion: 'domain' as const, value })),
    ...(filters.ownership === 'all'
      ? []
      : [{ criterion: 'ownership' as const, value: filters.ownership }]),
    ...(hasPriceRange(filters.priceRange)
      ? [{ criterion: 'price' as const, value: filters.priceRange }]
      : []),
  ];
}

const without = <T>(values: T[], value: T) => values.filter((v) => v !== value);

/** Ajoute `value` à la liste, ou l'en retire si elle y est déjà. */
export function toggled<T>(values: T[], value: T): T[] {
  return values.includes(value) ? without(values, value) : [...values, value];
}

/**
 * Affiche ou masque les Extensions promo. Les masquer retire aussi celles qui
 * étaient choisies : sinon la grille resterait vide sans raison visible.
 */
export function withPromoShown(filters: CatalogFilters, shown: boolean): CatalogFilters {
  return {
    ...filters,
    showPromo: shown,
    expansionCodes: shown
      ? filters.expansionCodes
      : filters.expansionCodes.filter((code) => !isPromoExpansion(code)),
  };
}

/** Les filtres sans `active`. */
export function removeActiveFilter(filters: CatalogFilters, active: ActiveFilter): CatalogFilters {
  switch (active.criterion) {
    case 'expansion':
      return { ...filters, expansionCodes: without(filters.expansionCodes, active.value) };
    case 'promo':
      return withPromoShown(filters, false);
    case 'rarity':
      return { ...filters, rarities: without(filters.rarities, active.value) };
    case 'variant':
      return { ...filters, variants: without(filters.variants, active.value) };
    case 'type':
      return { ...filters, types: without(filters.types, active.value) };
    case 'domain':
      return { ...filters, domains: without(filters.domains, active.value) };
    case 'ownership':
      return { ...filters, ownership: 'all' };
    case 'price':
      return { ...filters, priceRange: NO_PRICE_RANGE };
  }
}
