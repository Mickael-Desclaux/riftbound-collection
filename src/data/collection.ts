/** La Collection (Données précieuses) : quantité possédée par Code de version. */
import { eq } from 'drizzle-orm';

import type { PrintingCode } from '@/domain/printingCode';

import type { AppDatabase } from './database';
import { collectionEntry } from './schema';

/** Tables dont dépend `readOwnedQuantities`, pour la relecture réactive. */
export const COLLECTION_TABLES = ['collection_entry'];

/** Quantités de la Collection, par Code de version. */
export function readOwnedQuantities(db: AppDatabase): Map<string, number> {
  const rows = db.select().from(collectionEntry).all();
  return new Map(rows.map((row) => [row.printingCode, row.quantity]));
}

/** Règle la quantité dans la Collection ; à 0, la Version en est retirée. */
export function setOwnedQuantity(
  db: AppDatabase,
  printingCode: PrintingCode,
  quantity: number,
): void {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error(`Quantité refusée pour ${printingCode} : ${quantity}`);
  }
  if (quantity === 0) {
    db.delete(collectionEntry).where(eq(collectionEntry.printingCode, printingCode)).run();
    return;
  }
  db.insert(collectionEntry)
    .values({ printingCode, quantity })
    .onConflictDoUpdate({ target: collectionEntry.printingCode, set: { quantity } })
    .run();
}
