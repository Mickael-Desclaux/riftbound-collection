/** La Liste de souhaits (Données précieuses) : date d'ajout par Code de version. */
import { eq } from 'drizzle-orm';

import type { IsoDateTime } from '@/domain/dates';
import type { PrintingCode } from '@/domain/printingCode';

import type { AppDatabase } from './database';
import { wishlistEntry } from './schema';

/** Tables dont dépend `readWishlist`, pour la relecture réactive. */
export const WISHLIST_TABLES = ['wishlist_entry'];

/** Un souhait tel qu'enregistré, avec sa dernière Alerte de prix. */
export type WishlistEntry = typeof wishlistEntry.$inferSelect;

/** Date d'ajout de chaque souhait, par Code de version. */
export function readWishlist(db: AppDatabase): Map<PrintingCode, IsoDateTime> {
  const rows = db
    .select({ printingCode: wishlistEntry.printingCode, addedAt: wishlistEntry.addedAt })
    .from(wishlistEntry)
    .all();
  return new Map(rows.map((row) => [row.printingCode, row.addedAt]));
}

/**
 * Ajoute la Version à la Liste de souhaits à la date `addedAt`, ou l'en retire
 * (`null`) en rendant le souhait retiré, pour « Annuler ». Déjà en souhait,
 * elle garde sa date d'ajout d'origine.
 */
export function setWishlisted(
  db: AppDatabase,
  printingCode: PrintingCode,
  addedAt: IsoDateTime | null,
): WishlistEntry | null {
  if (addedAt === null) {
    return (
      db
        .delete(wishlistEntry)
        .where(eq(wishlistEntry.printingCode, printingCode))
        .returning()
        .get() ?? null
    );
  }
  db.insert(wishlistEntry).values({ printingCode, addedAt }).onConflictDoNothing().run();
  return null;
}

/** Remet un souhait retiré tel qu'il était (« Annuler »), dernière alerte comprise. */
export function restoreWishlistEntry(db: AppDatabase, entry: WishlistEntry): void {
  db.insert(wishlistEntry).values(entry).onConflictDoNothing().run();
}
