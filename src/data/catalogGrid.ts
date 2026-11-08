/**
 * Requêtes des grilles de Versions (Catalogue, puis Collection et Souhaits).
 * Elles renvoient des requêtes Drizzle, à exécuter ou à passer à `useLiveQuery`.
 */
import { and, asc, count, eq, inArray, or, sql, type SQL } from 'drizzle-orm';

import type { CatalogFilters } from '@/domain/catalogFilters';
import { PAGE_SIZE } from '@/domain/pagination';

import type { AppDatabase } from './database';
import { card, expansion, printing } from './schema';

/** Ce qu'une case de grille affiche. */
export const gridPrintingColumns = {
  printingCode: printing.printingCode,
  name: card.name,
  expansionCode: printing.expansionCode,
  collectorNumber: printing.collectorNumber,
  imageSmall: printing.imageSmall,
  imageNormal: printing.imageNormal,
};

/** Motif LIKE qui cherche `text` tel quel (`%` et `_` ne sont pas des jokers). */
function containing(text: string): string {
  return `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

function conditions(filters: CatalogFilters): SQL | undefined {
  const where: SQL[] = [];
  if (!filters.showPromo) where.push(eq(expansion.isPromo, false));
  if (filters.expansionCodes.length > 0) {
    where.push(inArray(printing.expansionCode, filters.expansionCodes));
  }
  const search = filters.search.trim();
  if (search !== '') {
    // LIKE ignore la casse des lettres ASCII, ce qui suffit pour des noms anglais.
    const pattern = containing(search);
    where.push(
      or(
        sql`${card.name} LIKE ${pattern} ESCAPE '\\'`,
        sql`${printing.printingCode} LIKE ${pattern} ESCAPE '\\'`,
      ) as SQL,
    );
  }
  return and(...where);
}

/** Une page de Versions, dans l'ordre de sortie des Extensions puis des numéros. */
export function selectCatalogPage(db: AppDatabase, filters: CatalogFilters, page: number) {
  return (
    db
      .select(gridPrintingColumns)
      .from(printing)
      .innerJoin(card, eq(card.oracleId, printing.cardOracleId))
      .innerJoin(expansion, eq(expansion.code, printing.expansionCode))
      .where(conditions(filters))
      // Les Extensions sans date de sortie (souvent les promos) passent en dernier.
      .orderBy(
        sql`${expansion.releasedAt} IS NULL`,
        asc(expansion.releasedAt),
        asc(printing.expansionCode),
        asc(printing.collectorNumber),
      )
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE)
  );
}

/** Nombre de Versions qui correspondent aux filtres (compteur « N versions »). */
export function selectCatalogCount(db: AppDatabase, filters: CatalogFilters) {
  return db
    .select({ count: count() })
    .from(printing)
    .innerJoin(card, eq(card.oracleId, printing.cardOracleId))
    .innerJoin(expansion, eq(expansion.code, printing.expansionCode))
    .where(conditions(filters));
}

/** Extensions de la rangée de puces, dans l'ordre de sortie. */
export function selectExpansionChips(db: AppDatabase, showPromo: boolean) {
  return db
    .select({ code: expansion.code, name: expansion.name })
    .from(expansion)
    .where(showPromo ? undefined : eq(expansion.isPromo, false))
    .orderBy(sql`${expansion.releasedAt} IS NULL`, asc(expansion.releasedAt), asc(expansion.code));
}
