/** Ce qui restreint une grille de Versions (spec § 2.1). La feuille de filtres (#25) le complétera. */
export type CatalogFilters = {
  /** Nom de Carte ou Code de version, sans tenir compte de la casse. */
  search: string;
  /** Extensions choisies par les puces ; vide = toutes. */
  expansionCodes: string[];
  /** « Afficher les extensions promo » : masquées par défaut. */
  showPromo: boolean;
};

export const DEFAULT_CATALOG_FILTERS: CatalogFilters = {
  search: '',
  expansionCodes: [],
  showPromo: false,
};
