/** La Sélection du classeur (Données précieuses) : les Versions à imprimer. */
import { inArray } from 'drizzle-orm';

import type { PrintingCode } from '@/domain/printingCode';

import { chunks } from './chunks';
import type { AppDatabase } from './database';
import { binderSelection } from './schema';

/** Tables dont dépend `readBinderSelection`, pour la relecture réactive. */
export const BINDER_SELECTION_TABLES = ['binder_selection'];

/** Les Codes de version de la Sélection du classeur. */
export function readBinderSelection(db: AppDatabase): Set<PrintingCode> {
  const rows = db.select().from(binderSelection).all();
  return new Set(rows.map((row) => row.printingCode));
}

/**
 * Ajoute les Versions à la Sélection du classeur (« Ajouter les N résultats au
 * classeur ») et rend celles qui n'y étaient pas encore, pour « Annuler ».
 */
export function addToBinderSelection(
  db: AppDatabase,
  printingCodes: PrintingCode[],
): PrintingCode[] {
  return db.transaction((tx) =>
    chunks(printingCodes).flatMap((part) =>
      tx
        .insert(binderSelection)
        .values(part.map((printingCode) => ({ printingCode })))
        .onConflictDoNothing()
        .returning()
        .all()
        .map((row) => row.printingCode),
    ),
  );
}

/** Retire les Versions de la Sélection du classeur (« Annuler » d'un ajout en masse). */
export function removeFromBinderSelection(db: AppDatabase, printingCodes: PrintingCode[]): void {
  db.transaction((tx) => {
    for (const part of chunks(printingCodes)) {
      tx.delete(binderSelection).where(inArray(binderSelection.printingCode, part)).run();
    }
  });
}
