/** Collection (spec § 2.1, § 2.3) : la bascule ✓ et les Versions de l'onglet Collection. */
import type { CatalogEntry } from './catalogEntry';
import type { PrintingCode } from './printingCode';

/** L'effet du ✓ : la nouvelle quantité, et celle que « Annuler » rétablit (`null` : pas de toast). */
export type OwnedToggle = { quantity: number; undoQuantity: number | null };

/**
 * ✓ d'une case de grille : une Version non possédée passe à ×1, une Version
 * possédée revient à 0. Possédée en plusieurs exemplaires, sa quantité est
 * gardée pour le toast « Retirée de la collection (×n) · Annuler ».
 */
export function toggleOwned(quantity: number): OwnedToggle {
  if (quantity === 0) return { quantity: 1, undoQuantity: null };
  return { quantity: 0, undoQuantity: quantity > 1 ? quantity : null };
}

/**
 * Une Version inconnue : possédée, mais son Code de version n'est plus dans le
 * Catalogue. Sans prix, elle est exclue de la valeur ; on ne la supprime jamais.
 */
function unknownEntry(printingCode: PrintingCode, quantity: number): CatalogEntry {
  return {
    printingCode,
    name: printingCode,
    expansionCode: printingCode.split('-')[0] ?? '',
    expansionRank: Number.MAX_SAFE_INTEGER,
    // Jamais masquée par « Afficher les extensions promo » : elle doit rester visible.
    isPromo: false,
    collectorNumber: '',
    rarity: '',
    variant: 'normal',
    type: '',
    domains: [],
    inCatalog: false,
    ownedQuantity: quantity,
    finishes: [],
    price: null,
    priceChange7d: null,
    priceChange30d: null,
    imageSmall: null,
    imageNormal: null,
  };
}

/**
 * Les Versions de l'onglet Collection : celles du Catalogue possédées
 * (`entries`, avec leur quantité), puis les Versions inconnues de `owned`.
 */
export function collectionEntries(
  entries: CatalogEntry[],
  owned: Map<string, number>,
): CatalogEntry[] {
  const known = new Set(entries.map((entry) => entry.printingCode as string));
  const unknown = [...owned]
    .filter(([code, quantity]) => quantity > 0 && !known.has(code))
    .map(([code, quantity]) => unknownEntry(code as PrintingCode, quantity));
  return [...entries.filter((entry) => entry.ownedQuantity > 0), ...unknown];
}
