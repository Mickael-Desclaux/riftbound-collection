/** Collection (spec § 2.1, § 2.3) : la bascule ✓ et les Versions de l'onglet Collection. */
import { unknownEntries, type CatalogEntry } from './catalogEntry';
import type { IsoDateTime } from './dates';
import type { PrintingCode } from './printingCode';

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
 * Les Versions de l'onglet Collection : celles du Catalogue possédées
 * (`entries`, avec leur quantité), puis les Versions inconnues de `owned`.
 */
export function collectionEntries(
  entries: CatalogEntry[],
  owned: ReadonlyMap<PrintingCode, number>,
  wishlist: ReadonlyMap<PrintingCode, IsoDateTime> = new Map(),
): CatalogEntry[] {
  const unknown = unknownEntries(entries, [...owned.keys()], owned, wishlist);
  return [...entries, ...unknown].filter((entry) => entry.ownedQuantity > 0);
}
