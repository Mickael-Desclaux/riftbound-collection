import type { CatalogSort } from '@/domain/catalogSort';
import { DEFAULT_CATALOG_SORT } from '@/domain/catalogSort';
import { PrintingBrowser } from '@/features/printing-browser/PrintingBrowser';
import { usePrintingEntries } from '@/features/printing-browser/usePrintingEntries';

const CATALOG_SORTS: readonly CatalogSort[] = [
  'number',
  'name',
  'priceAsc',
  'priceDesc',
  'change7dAsc',
  'change7dDesc',
  'change30dAsc',
  'change30dDesc',
];

/** Onglet Catalogue : toutes les Versions, dans la grille commune. */
export function CatalogScreen() {
  const { entries } = usePrintingEntries();
  return (
    <PrintingBrowser
      tab="catalog"
      entries={entries}
      sorts={CATALOG_SORTS}
      defaultSort={DEFAULT_CATALOG_SORT}
    />
  );
}
