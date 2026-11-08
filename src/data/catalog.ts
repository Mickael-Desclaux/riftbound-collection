/** Écriture du Catalogue (Données de référence). Ne touche jamais aux Données précieuses. */
import { getTableColumns, inArray, sql, type SQL } from 'drizzle-orm';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';

import type { Catalog } from '@/domain/catalog';

import type { AppDatabase } from './database';
import { card, expansion, printing } from './schema';

/** Lignes par requête, pour rester loin de la limite de paramètres de SQLite. */
const CHUNK = 100;

function chunks<T>(items: T[]): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += CHUNK) result.push(items.slice(i, i + CHUNK));
  return result;
}

/** `SET colonne = excluded.colonne` pour toutes les colonnes données. */
function updateFromExcluded(table: SQLiteTable, keys: string[]): Record<string, SQL> {
  const columns = getTableColumns(table) as Record<string, SQLiteColumn>;
  return Object.fromEntries(
    keys.map((key) => [key, sql.raw(`excluded.${columns[key]?.name ?? key}`)]),
  );
}

/**
 * Remplace le Catalogue par celui qui vient d'être téléchargé, en une transaction :
 * les lignes existantes sont mises à jour, les nouvelles ajoutées, les disparues
 * supprimées. Les colonnes que le Catalogue ne fournit pas (`cardmarket_product_id`,
 * venu d'OpenRift) sont conservées.
 */
export function replaceCatalog(db: AppDatabase, catalog: Catalog): void {
  db.transaction((tx) => {
    for (const rows of chunks(catalog.expansions)) {
      tx.insert(expansion)
        .values(rows)
        .onConflictDoUpdate({
          target: expansion.code,
          set: updateFromExcluded(expansion, ['name', 'releasedAt', 'isPromo', 'cardCount']),
        })
        .run();
    }
    for (const rows of chunks(catalog.cards)) {
      tx.insert(card)
        .values(rows)
        .onConflictDoUpdate({
          target: card.oracleId,
          set: updateFromExcluded(card, ['name', 'type', 'subtype', 'domains', 'text']),
        })
        .run();
    }
    const printingKeys = Object.keys(catalog.printings[0] ?? {}).filter(
      (key) => key !== 'printingCode',
    );
    for (const rows of chunks(catalog.printings)) {
      tx.insert(printing)
        .values(rows)
        .onConflictDoUpdate({
          target: printing.printingCode,
          set: updateFromExcluded(printing, printingKeys),
        })
        .run();
    }

    deleteMissing(
      tx,
      printing,
      printing.printingCode,
      catalog.printings.map((p) => p.printingCode),
    );
    deleteMissing(
      tx,
      card,
      card.oracleId,
      catalog.cards.map((c) => c.oracleId),
    );
    deleteMissing(
      tx,
      expansion,
      expansion.code,
      catalog.expansions.map((e) => e.code),
    );
  });
}

function deleteMissing(
  tx: Pick<AppDatabase, 'select' | 'delete'>,
  table: SQLiteTable,
  key: SQLiteColumn,
  kept: string[],
): void {
  const keep = new Set(kept);
  const existing = tx.select({ key }).from(table).all() as { key: string }[];
  const missing = existing.map((row) => row.key).filter((value) => !keep.has(value));
  for (const values of chunks(missing)) {
    tx.delete(table).where(inArray(key, values)).run();
  }
}

/** Extensions enregistrées, pour détecter un changement de Catalogue. */
export function storedExpansions(db: AppDatabase): { code: string; cardCount: number }[] {
  return db.select({ code: expansion.code, cardCount: expansion.cardCount }).from(expansion).all();
}
