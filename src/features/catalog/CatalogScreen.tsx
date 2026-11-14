import { CATALOG_SORTS, DEFAULT_CATALOG_SORT } from '@/domain/catalogSort';
import { useToggleOwned } from '@/features/collection/useToggleOwned';
import { PrintingBrowser } from '@/features/printing-browser/PrintingBrowser';
import { usePrintingEntries } from '@/features/printing-browser/usePrintingEntries';

/** Onglet Catalogue : toutes les Versions, dans la grille commune. */
export function CatalogScreen() {
  const { entries } = usePrintingEntries();
  const toggleOwned = useToggleOwned();
  return (
    <PrintingBrowser
      tab="catalog"
      entries={entries}
      sorts={CATALOG_SORTS}
      defaultSort={DEFAULT_CATALOG_SORT}
      onToggleOwned={toggleOwned}
    />
  );
}
