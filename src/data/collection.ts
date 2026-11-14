/** La Collection (Données précieuses) : quantité possédée par Code de version. */
import { eq } from 'drizzle-orm';

import type { PrintingCode } from '@/domain/printingCode';
import { leavesWishlist } from '@/domain/wishlist';

import type { AppDatabase } from './database';
import { collectionEntry, wishlistEntry } from './schema';
import type { WishlistEntry } from './wishlist';

/** Tables dont dépend `readOwnedQuantities`, pour la relecture réactive. */
export const COLLECTION_TABLES = ['collection_entry'];

/** Quantités de la Collection, par Code de version. */
export function readOwnedQuantities(db: AppDatabase): Map<PrintingCode, number> {
  const rows = db.select().from(collectionEntry).all();
  return new Map(rows.map((row) => [row.printingCode, row.quantity]));
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
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error(`Quantité refusée pour ${printingCode} : ${quantity}`);
  }
  return db.transaction((tx) => {
    const previous =
      tx
        .select({ quantity: collectionEntry.quantity })
        .from(collectionEntry)
        .where(eq(collectionEntry.printingCode, printingCode))
        .get()?.quantity ?? 0;
    if (quantity === 0) {
      tx.delete(collectionEntry).where(eq(collectionEntry.printingCode, printingCode)).run();
    } else {
      tx.insert(collectionEntry)
        .values({ printingCode, quantity })
        .onConflictDoUpdate({ target: collectionEntry.printingCode, set: { quantity } })
        .run();
    }
    if (!leavesWishlist(previous, quantity)) return null;
    return (
      tx
        .delete(wishlistEntry)
        .where(eq(wishlistEntry.printingCode, printingCode))
        .returning()
        .get() ?? null
    );
  });
}
