/** Le classeur imprimé (spec § 2.5) : pages A4 de 3 × 3 cartes. */
import { unknownEntries, type CatalogEntry } from './catalogEntry';
import { sortCatalog } from './catalogSort';
import type { IsoDateTime } from './dates';
import type { PrintingCode } from './printingCode';

/** Cartes par page A4 (3 × 3). */
export const BINDER_PAGE_SIZE = 9;

/** Une page du classeur, numérotée dans son Extension (« page x/y »). */
export type BinderPage = {
  expansionCode: string;
  /** Rang de la page dans son Extension, à partir de 1. */
  number: number;
  /** Nombre de pages de l'Extension. */
  count: number;
  printings: CatalogEntry[];
};

/**
 * Les pages du classeur, dans l'ordre d'impression (spec § 2.5) : par
 * Extension, dans l'ordre de sortie, puis par numéro. Chaque Extension commence
 * sur une nouvelle page, sans trou dans une page. Une Version inconnue reste
 * dans son Extension, à la fin ; celle d'une Extension disparue va en dernier.
 */
export function binderPages(printings: CatalogEntry[]): BinderPage[] {
  const byExpansion = new Map<string, CatalogEntry[]>();
  for (const printing of sortCatalog(printings, 'number')) {
    const group = byExpansion.get(printing.expansionCode) ?? [];
    group.push(printing);
    byExpansion.set(printing.expansionCode, group);
  }
  return [...byExpansion].flatMap(([expansionCode, group]) => {
    const count = Math.ceil(group.length / BINDER_PAGE_SIZE);
    return Array.from({ length: count }, (_, i) => ({
      expansionCode,
      number: i + 1,
      count,
      printings: group.slice(i * BINDER_PAGE_SIZE, (i + 1) * BINDER_PAGE_SIZE),
    }));
  });
}

/**
 * Les Versions de la Sélection du classeur : celles du Catalogue (`entries`),
 * puis les Versions inconnues de `selection`.
 */
export function binderEntries(
  entries: CatalogEntry[],
  selection: ReadonlySet<PrintingCode>,
  owned: ReadonlyMap<PrintingCode, number>,
  wishlist: ReadonlyMap<PrintingCode, IsoDateTime>,
): CatalogEntry[] {
  const unknown = unknownEntries(entries, selection, owned, wishlist);
  return [...entries, ...unknown].filter((entry) => selection.has(entry.printingCode));
}
