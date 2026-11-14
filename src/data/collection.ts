/**
 * La Collection (Données précieuses) : quantité possédée par Code de version,
 * avec la date d'entrée et la dernière Alerte de prix (hausse).
 */
import { eq, type InferSelectModel } from 'drizzle-orm';

import type { PrintingCode } from '@/domain/printingCode';
import { leavesWishlist } from '@/domain/wishlist';

import type { AppDatabase } from './database';
import { collectionEntry } from './schema';
import { removeFromWishlist, type WishlistEntry } from './wishlist';

/** Une ligne de la Collection, telle qu'« Annuler » doit la rendre. */
export type CollectionEntry = InferSelectModel<typeof collectionEntry>;

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

/** La ligne de la Collection d'une Version, ou `null` si elle n'est pas possédée. */
export function readCollectionEntry(
  db: Pick<AppDatabase, 'select'>,
  printingCode: PrintingCode,
): CollectionEntry | null {
  return (
    db.select().from(collectionEntry).where(eq(collectionEntry.printingCode, printingCode)).get() ??
    null
  );
}

/**
 * Rétablit une ligne retirée (« Annuler » du ✓) telle quelle, avec sa date
 * d'entrée et sa dernière alerte : c'est l'état d'avant, pas une
 * acquisition, donc la Liste de souhaits n'est pas touchée.
 */
export function restoreCollectionEntry(db: AppDatabase, entry: CollectionEntry): void {
  checkQuantity(entry.printingCode, entry.quantity);
  db.insert(collectionEntry)
    .values(entry)
    .onConflictDoUpdate({ target: collectionEntry.printingCode, set: entry })
    .run();
}

/**
 * Règle la quantité dans la Collection ; à 0, la Version en est retirée. Une
 * Version qui passe de 0 à au moins 1 exemplaire y entre à `now`, et quitte
 * la Liste de souhaits (spec § 2.4) : on rend alors son souhait, pour « Annuler ».
 */
export function setOwnedQuantity(
  db: AppDatabase,
  printingCode: PrintingCode,
  quantity: number,
  now: Date,
): WishlistEntry | null {
  checkQuantity(printingCode, quantity);
  return db.transaction((tx) => {
    const previous = readCollectionEntry(tx, printingCode)?.quantity ?? 0;
    if (quantity === 0) {
      tx.delete(collectionEntry).where(eq(collectionEntry.printingCode, printingCode)).run();
    } else {
      tx.insert(collectionEntry)
        .values({ printingCode, quantity, addedAt: now.toISOString() })
        .onConflictDoUpdate({ target: collectionEntry.printingCode, set: { quantity } })
        .run();
    }
    return leavesWishlist(previous, quantity) ? removeFromWishlist(tx, printingCode) : null;
  });
}
