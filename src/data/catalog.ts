/** Écriture du Catalogue (Données de référence). Ne touche jamais aux Données précieuses. */
import { count, eq, getTableColumns, inArray, isNotNull, sql, type SQL } from 'drizzle-orm';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';

import type { CardmarketLinks, Catalog, Expansion } from '@/domain/catalog';

import type { AppDatabase } from './database';
import { chunks } from './chunks';
import { card, expansion, printing } from './schema';

type Transaction = Parameters<Parameters<AppDatabase['transaction']>[0]>[0];

/** Insère les lignes, ou met à jour les colonnes données si la clé existe déjà. */
function upsertAll<T extends SQLiteTable>(
  tx: Transaction,
  table: T,
  key: SQLiteColumn,
  updatedKeys: (keyof T['$inferInsert'] & string)[],
  rows: T['$inferInsert'][],
): void {
  const columns = getTableColumns(table) as Record<string, SQLiteColumn>;
  const set: Record<string, SQL> = Object.fromEntries(
    updatedKeys.map((k) => [k, sql.raw(`excluded.${columns[k]?.name ?? k}`)]),
  );
  for (const values of chunks(rows)) {
    tx.insert(table).values(values).onConflictDoUpdate({ target: key, set }).run();
  }
}

/** Supprime les lignes dont la clé n'est plus dans `kept`. */
function deleteMissing(tx: Transaction, table: SQLiteTable, key: SQLiteColumn, kept: string[]) {
  const keep = new Set(kept);
  const existing = tx.select({ key }).from(table).all() as { key: string }[];
  const missing = existing.map((row) => row.key).filter((value) => !keep.has(value));
  for (const values of chunks(missing)) {
    tx.delete(table).where(inArray(key, values)).run();
  }
}

/**
 * Remplace le Catalogue par celui qui vient d'être téléchargé, en une transaction :
 * les lignes existantes sont mises à jour, les nouvelles ajoutées, les disparues
 * supprimées. `cardmarket_product_id` (venu d'OpenRift) est conservé.
 *
 * Les Versions disparues sont supprimées en premier : une Version dont le Code de
 * version change garde son `rifthunt_printing_id`, qui doit être libéré d'abord.
 *
 * `rebuild` (« Reconstruire le catalogue ») efface d'abord tout le Catalogue :
 * il ne reste que ce qui vient d'être téléchargé. Seule la correspondance
 * OpenRift est remise, jusqu'à ce qu'OpenRift la remplace (spec § 5 : si
 * OpenRift est indisponible, on garde la dernière connue). Les prix du jour et
 * les Données précieuses ne sont pas touchés.
 */
export function replaceCatalog(
  db: AppDatabase,
  catalog: Catalog,
  { rebuild = false }: { rebuild?: boolean } = {},
): void {
  db.transaction((tx) => {
    const links = rebuild ? readLinks(tx) : [];
    if (rebuild) {
      for (const table of [printing, card, expansion]) tx.delete(table).run();
    }
    const printingCodes = catalog.printings.map((p) => p.printingCode);
    deleteMissing(tx, printing, printing.printingCode, printingCodes);

    upsertAll(
      tx,
      expansion,
      expansion.code,
      ['name', 'releasedAt', 'isPromo', 'cardCount'],
      catalog.expansions,
    );
    upsertAll(
      tx,
      card,
      card.oracleId,
      ['name', 'type', 'subtype', 'domains', 'text'],
      catalog.cards,
    );
    upsertAll(
      tx,
      printing,
      printing.printingCode,
      [
        'cardOracleId',
        'expansionCode',
        'collectorNumber',
        'rarity',
        'variant',
        'finishes',
        'imageSmall',
        'imageNormal',
        'imageLarge',
        'artist',
        'rifthuntPrintingId',
        'tcgId',
      ],
      catalog.printings,
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
    for (const { printingCode, cardmarketProductId } of links) {
      tx.update(printing)
        .set({ cardmarketProductId })
        .where(eq(printing.printingCode, printingCode))
        .run();
    }
  });
}

/** Les Versions reliées à un produit Cardmarket. */
function readLinks(tx: Transaction) {
  return tx
    .select({
      printingCode: printing.printingCode,
      cardmarketProductId: printing.cardmarketProductId,
    })
    .from(printing)
    .where(isNotNull(printing.cardmarketProductId))
    .all();
}

/** Le Catalogue a-t-il déjà été téléchargé sur cet appareil ? */
export function hasCatalog(db: AppDatabase): boolean {
  return (db.select({ n: count() }).from(expansion).get()?.n ?? 0) > 0;
}

/** Extensions enregistrées, pour détecter un changement de Catalogue. */
export function storedExpansions(
  db: AppDatabase,
): Pick<Expansion, 'code' | 'name' | 'isPromo' | 'cardCount'>[] {
  return db
    .select({
      code: expansion.code,
      name: expansion.name,
      isPromo: expansion.isPromo,
      cardCount: expansion.cardCount,
    })
    .from(expansion)
    .all();
}

/**
 * Remplace la correspondance `tcgId` → `idProduct` Cardmarket de toutes les
 * Versions : une Version sans correspondance n'a plus de produit Cardmarket.
 * Seules les Versions qui changent sont réécrites.
 */
export function applyCardmarketLinks(db: AppDatabase, links: CardmarketLinks): void {
  db.transaction((tx) => {
    const rows = tx
      .select({
        printingCode: printing.printingCode,
        tcgId: printing.tcgId,
        current: printing.cardmarketProductId,
      })
      .from(printing)
      .all();
    for (const { printingCode, tcgId, current } of rows) {
      const next = tcgId === null ? null : (links.get(tcgId) ?? null);
      if (next === current) continue;
      tx.update(printing)
        .set({ cardmarketProductId: next })
        .where(eq(printing.printingCode, printingCode))
        .run();
    }
  });
}
