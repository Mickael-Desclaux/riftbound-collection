/** Collection (spec § 2.1, § 2.3) : la bascule ✓ et les Versions de l'onglet Collection. */
import { isPromoExpansion } from './catalog';
import type { CatalogEntry } from './catalogEntry';
import { expansionCodeOf, type PrintingCode } from './printingCode';

/** L'effet du ✓ : la nouvelle quantité, et celle que « Annuler » rétablit (`null` : pas de toast). */
export type OwnedToggle = { quantity: number; undoQuantity: number | null };

/**
 * ✓ d'une case de grille : une Version non possédée passe à ×1, une Version
 * possédée revient à 0. Possédée en plusieurs exemplaires, sa quantité est
 * gardée pour le toast « Retirée de la collection (×n) · Annuler ». Une Version
 * inconnue (`inCatalog` faux) a toujours ce toast : sans fiche ni case dans le
 * Catalogue, on ne pourrait plus la remettre dans la Collection.
 */
export function toggleOwned(quantity: number, inCatalog: boolean): OwnedToggle {
  if (quantity === 0) return { quantity: 1, undoQuantity: null };
  return { quantity: 0, undoQuantity: quantity > 1 || !inCatalog ? quantity : null };
}

/**
 * Une Version inconnue : possédée, mais son Code de version n'est plus dans le
 * Catalogue. Sans prix, elle est exclue de la valeur ; on ne la supprime jamais.
 */
function unknownEntry(printingCode: PrintingCode, quantity: number): CatalogEntry {
  const expansionCode = expansionCodeOf(printingCode);
  return {
    printingCode,
    name: printingCode,
    expansionCode,
    expansionRank: Number.MAX_SAFE_INTEGER,
    isPromo: isPromoExpansion(expansionCode),
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
  owned: Map<PrintingCode, number>,
): CatalogEntry[] {
  const known = new Set(entries.map((entry) => entry.printingCode));
  const unknown = [...owned]
    .filter(([code, quantity]) => quantity > 0 && !known.has(code))
    .map(([code, quantity]) => unknownEntry(code, quantity));
  return [...entries.filter((entry) => entry.ownedQuantity > 0), ...unknown];
}
