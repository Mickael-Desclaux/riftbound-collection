/** La Collection (Données précieuses) : quantité possédée par Code de version. */
import { eq } from 'drizzle-orm';

import type { PrintingCode } from '@/domain/printingCode';
import { leavesWishlist } from '@/domain/wishlist';

import type { AppDatabase } from './database';
import { collectionEntry } from './schema';
import { removeFromWishlist, type WishlistEntry } from './wishlist';

/** Tables dont dépend `readOwnedQuantities`, pour la relecture réactive. */
export const COLLECTION_TABLES = ['collection_entry'];

/** Quantités de la Collection, par Code de version. */
export function readOwnedQuantities(db: AppDatabase): Map<PrintingCode, number> {
  const rows = db.select().from(collectionEntry).all();
  return new Map(rows.map((row) => [row.printingCode, row.quantity]));
}

function checkQuantity(printingCode: PrintingCode, quantity: number): void {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error(`Quantité refusée pour ${printingCode} : ${quantity}`);
  }
}

function writeQuantity(
  db: Pick<AppDatabase, 'delete' | 'insert'>,
  printingCode: PrintingCode,
  quantity: number,
): void {
  if (quantity === 0) {
    db.delete(collectionEntry).where(eq(collectionEntry.printingCode, printingCode)).run();
    return;
  }
  db.insert(collectionEntry)
    .values({ printingCode, quantity })
    .onConflictDoUpdate({ target: collectionEntry.printingCode, set: { quantity } })
    .run();
}

/**
 * Rétablit une quantité retirée (« Annuler » du ✓) : c'est l'état d'avant,
 * pas une acquisition, donc la Liste de souhaits n'est pas touchée.
 */
export function restoreOwnedQuantity(
  db: AppDatabase,
  printingCode: PrintingCode,
  quantity: number,
): void {
  checkQuantity(printingCode, quantity);
  writeQuantity(db, printingCode, quantity);
}

/**
 * Règle la quantité dans la Collection ; à 0, la Version en est retirée. Une
 * Version qui passe de 0 à au moins 1 exemplaire quitte la Liste de souhaits
 * (spec § 2.4) : on rend alors son souhait, pour « Annuler ».
 */
export function setOwnedQuantity(
  db: AppDatabase,
  printingCode: PrintingCode,
  quantity: number,
): WishlistEntry | null {
  checkQuantity(printingCode, quantity);
  return db.transaction((tx) => {
    const previous =
      tx
        .select({ quantity: collectionEntry.quantity })
        .from(collectionEntry)
        .where(eq(collectionEntry.printingCode, printingCode))
        .get()?.quantity ?? 0;
    writeQuantity(tx, printingCode, quantity);
    return leavesWishlist(previous, quantity) ? removeFromWishlist(tx, printingCode) : null;
  });
}
