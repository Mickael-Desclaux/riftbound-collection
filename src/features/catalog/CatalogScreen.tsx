import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import { DEFAULT_CATALOG_FILTERS, type CatalogFilters } from '@/domain/catalogFilters';
import { CATALOG_SORTS, DEFAULT_CATALOG_SORT } from '@/domain/catalogSort';
import { useToggleOwned } from '@/features/collection/useToggleOwned';
import { PrintingBrowser } from '@/features/printing-browser/PrintingBrowser';
import { usePrintingEntries } from '@/features/printing-browser/usePrintingEntries';
import type { MissingInExpansionParams } from '@/ui/printingHref';

/**
 * Onglet Catalogue : toutes les Versions, dans la grille commune. Une ligne de
 * Complétion de la Collection l'ouvre filtré sur une Extension et « Manquantes ».
 */
export function CatalogScreen() {
  const { entries } = usePrintingEntries();
  const toggleOwned = useToggleOwned();
  const { missingIn, requestedAt } = useLocalSearchParams<MissingInExpansionParams>();
  const filtersRequest = useMemo(
    (): CatalogFilters | null =>
      missingIn && requestedAt
        ? { ...DEFAULT_CATALOG_FILTERS, expansionCodes: [missingIn], ownership: 'missing' }
        : null,
    [missingIn, requestedAt],
  );
  return (
    <PrintingBrowser
      tab="catalog"
      entries={entries}
      sorts={CATALOG_SORTS}
      defaultSort={DEFAULT_CATALOG_SORT}
      onToggleOwned={toggleOwned}
      filtersRequest={filtersRequest}
    />
  );
}
