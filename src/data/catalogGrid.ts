/**
 * Requêtes des grilles de Versions. Elles renvoient des requêtes Drizzle, à
 * exécuter avec `.all()` / `.get()` (ou via `useReactiveQuery` dans l'interface).
 * Collection et Souhaits (#33, #35) y ajouteront leurs propres conditions.
 */
import { and, asc, count, eq, inArray, or, sql, type SQL } from 'drizzle-orm';

import type { CatalogFilters } from '@/domain/catalogFilters';
import { PAGE_SIZE } from '@/domain/pagination';

import type { AppDatabase } from './database';
import { card, expansion, printing } from './schema';

/** Ce qu'une case de grille affiche (voir `GridPrinting` dans `ui/printing-grid`). */
const gridPrintingColumns = {
  printingCode: printing.printingCode,
  name: card.name,
  imageSmall: printing.imageSmall,
  imageNormal: printing.imageNormal,
};

/** Ordre de sortie des Extensions ; celles sans date (souvent les promos) en dernier. */
const expansionOrder = [sql`${expansion.releasedAt} IS NULL`, asc(expansion.releasedAt)];

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

/**
 * Une page de Versions, dans l'ordre de sortie des Extensions puis des numéros.
 * Le Code de version départage les Versions qui partagent un numéro (vagues OPP) :
 * sans lui, une Version pourrait apparaître sur deux pages et une autre sur aucune.
 */
export function selectCatalogPage(db: AppDatabase, filters: CatalogFilters, page: number) {
  return db
    .select(gridPrintingColumns)
    .from(printing)
    .innerJoin(card, eq(card.oracleId, printing.cardOracleId))
    .innerJoin(expansion, eq(expansion.code, printing.expansionCode))
    .where(conditions(filters))
    .orderBy(
      ...expansionOrder,
      asc(printing.expansionCode),
      asc(printing.collectorNumber),
      asc(printing.printingCode),
    )
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);
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
    .orderBy(...expansionOrder, asc(expansion.code));
}
