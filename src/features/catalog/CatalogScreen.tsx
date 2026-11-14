import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CATALOG_ENTRY_TABLES,
  readCatalogEntries,
  readFilterOptions,
  readOwnedQuantities,
  selectExpansionChips,
} from '@/data/catalogGrid';
import { useDatabase } from '@/data/DatabaseProvider';
import { useReactiveQuery } from '@/data/useReactiveQuery';
import { readExchangeRates } from '@/data/exchangeRates';
import { readCurrentPrices, referenceMetricValuesOn } from '@/data/prices';
import { useSetting } from '@/data/useSetting';
import {
  withOwnedQuantities,
  withPriceChanges,
  withPrices,
  type ReferenceMetricValuesByDay,
} from '@/domain/catalogEntry';
import { addDays, toIsoDate } from '@/domain/dates';
import {
  activeFilters,
  DEFAULT_CATALOG_FILTERS,
  filterCatalog,
  toggled,
  type CatalogFilters,
} from '@/domain/catalogFilters';
import { DEFAULT_CATALOG_SORT, sortCatalog, type CatalogSort } from '@/domain/catalogSort';
import { pageCount, pageOf } from '@/domain/pagination';
import { Chip, controlStyles } from '@/ui/controls';
import { formatPrintingCount } from '@/ui/format';
import { gridImageUri } from '@/ui/printing-grid/gridPrinting';
import { PrintingGrid } from '@/ui/printing-grid/PrintingGrid';
import { useClock } from '@/ui/ClockContext';
import { useSync } from '@/ui/SyncContext';
import { colors } from '@/ui/theme';

import { printingHref } from '@/ui/printingHref';

import { ActiveFilterChips } from './ActiveFilterChips';
import { FilterSheet, type FilterOptions } from './FilterSheet';

const SORT_LABELS: Record<CatalogSort, string> = {
  number: 'Numéro',
  name: 'Nom',
  priceAsc: 'Prix ↑',
  priceDesc: 'Prix ↓',
  change7dAsc: 'Variation 7 j ↑',
  change7dDesc: 'Variation 7 j ↓',
  change30dAsc: 'Variation 30 j ↑',
  change30dDesc: 'Variation 30 j ↓',
};

/**
 * Onglet Catalogue : toutes les Versions, avec recherche, puces d'Extension,
 * feuille de filtres, tri et pagination. Filtres, tri et page vivent dans cet
 * écran, qui reste monté quand une fiche s'ouvre par-dessus (Stack de l'onglet).
 */
export function CatalogScreen() {
  const db = useDatabase();
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_CATALOG_FILTERS);
  const [sort, setSort] = useState<CatalogSort>(DEFAULT_CATALOG_SORT);
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { refresh } = useSync();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => {
    setRefreshing(true);
    void refresh().finally(() => setRefreshing(false));
  };

  const catalog = useReactiveQuery(() => readCatalogEntries(db), [db], CATALOG_ENTRY_TABLES);
  const owned = useReactiveQuery(() => readOwnedQuantities(db), [db], ['collection_entry']);
  const [displayCurrency] = useSetting('displayCurrency');
  // Une fourchette de prix est exprimée dans la Devise d'affichage : elle n'a
  // plus de sens dans une autre devise, on la retire.
  const [rangeCurrency, setRangeCurrency] = useState(displayCurrency);
  if (rangeCurrency !== displayCurrency) {
    setRangeCurrency(displayCurrency);
    setFilters((current) => ({ ...current, priceRange: DEFAULT_CATALOG_FILTERS.priceRange }));
  }
  const [priceSource] = useSetting('priceSource');
  const prices = useReactiveQuery(
    () => readCurrentPrices(db, priceSource),
    [db, priceSource],
    ['current_price'],
  );
  const rates = useReactiveQuery(() => readExchangeRates(db), [db], ['exchange_rate']);
  const now = useClock();
  const values = useReactiveQuery(
    (): ReferenceMetricValuesByDay => {
      const today = toIsoDate(now());
      return {
        today: referenceMetricValuesOn(db, priceSource, today),
        daysAgo7: referenceMetricValuesOn(db, priceSource, addDays(today, -7)),
        daysAgo30: referenceMetricValuesOn(db, priceSource, addDays(today, -30)),
      };
    },
    [db, priceSource, now],
    ['price_record'],
  );
  const entries = useMemo(
    () =>
      withPriceChanges(
        withPrices(withOwnedQuantities(catalog, owned), prices, displayCurrency, rates),
        values,
      ),
    [catalog, owned, prices, displayCurrency, rates, values],
  );
  const options = useReactiveQuery(
    (): FilterOptions => {
      const all = selectExpansionChips(db, true).all();
      const main = selectExpansionChips(db, false).all();
      return {
        ...readFilterOptions(db),
        expansions: main,
        promoExpansions: all.filter((e) => !main.some((m) => m.code === e.code)),
      };
    },
    [db],
    CATALOG_ENTRY_TABLES,
  );

  const results = useMemo(
    () => sortCatalog(filterCatalog(entries, filters), sort),
    [entries, filters, sort],
  );
  const pages = pageCount(results.length);
  // Le Catalogue a rétréci sous la page courante : on revient à la dernière page.
  if (page > pages) setPage(pages);
  const currentPage = Math.min(page, pages);
  const items = pageOf(results, currentPage);

  // Préchargement des images de la page suivante (spec § 6).
  useEffect(() => {
    const urls = pageOf(results, currentPage + 1)
      .map(gridImageUri)
      .filter((url) => url !== null);
    if (urls.length === 0) return;
    Image.prefetch(urls, 'disk').catch(() => {
      // Le préchargement n'est qu'une aide : l'image sera chargée à l'affichage.
    });
  }, [results, currentPage]);

  const changeFilters = (next: CatalogFilters) => {
    setFilters(next);
    setPage(1);
  };
  const toggleExpansion = (code: string) =>
    changeFilters({ ...filters, expansionCodes: toggled(filters.expansionCodes, code) });
  const changeSort = (next: CatalogSort) => {
    setSort(next);
    setPage(1);
  };
  const activeCount = activeFilters(filters).length;

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <PrintingGrid
        items={items}
        displayCurrency={displayCurrency}
        page={currentPage}
        pageCount={pages}
        onPageChange={setPage}
        onClearFilters={() => changeFilters(DEFAULT_CATALOG_FILTERS)}
        onOpenPrinting={(code) => router.push(printingHref('catalog', code))}
        onRefresh={onRefresh}
        refreshing={refreshing}
        header={
          <View style={styles.header}>
            <TextInput
              value={filters.search}
              onChangeText={(search) => changeFilters({ ...filters, search })}
              placeholder="Rechercher un nom ou un code…"
              placeholderTextColor={colors.muted}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
              returnKeyType="search"
              style={styles.search}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
              keyboardShouldPersistTaps="handled"
            >
              <Chip
                label="Toutes"
                selected={filters.expansionCodes.length === 0}
                onPress={() => changeFilters({ ...filters, expansionCodes: [] })}
              />
              {options.expansions.map((chip) => (
                <Chip
                  key={chip.code}
                  label={chip.name}
                  selected={filters.expansionCodes.includes(chip.code)}
                  onPress={() => toggleExpansion(chip.code)}
                />
              ))}
            </ScrollView>
            <View style={styles.toolbar}>
              <Chip
                label={activeCount > 0 ? `Filtres (${activeCount})` : 'Filtres'}
                selected={activeCount > 0}
                onPress={() => setSheetOpen(true)}
              />
              <SortMenu sort={sort} onChange={changeSort} />
              <Text style={styles.count}>{formatPrintingCount(results.length)}</Text>
            </View>
            <ActiveFilterChips
              filters={filters}
              options={options}
              displayCurrency={displayCurrency}
              onChange={changeFilters}
            />
          </View>
        }
      />
      <FilterSheet
        visible={sheetOpen}
        filters={filters}
        options={options}
        resultCount={results.length}
        displayCurrency={displayCurrency}
        onChange={changeFilters}
        onClose={() => setSheetOpen(false)}
      />
    </SafeAreaView>
  );
}

/** Menu de tri : un bouton qui ouvre la liste des tris. */
function SortMenu({
  sort,
  onChange,
}: Readonly<{
  sort: CatalogSort;
  onChange: (sort: CatalogSort) => void;
}>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Chip label={`Tri : ${SORT_LABELS[sort]} ▾`} selected={false} onPress={() => setOpen(true)} />
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.menuScrim} onPress={() => setOpen(false)}>
          <View style={styles.menu}>
            {(Object.keys(SORT_LABELS) as CatalogSort[]).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: value === sort }}
                onPress={() => {
                  onChange(value);
                  setOpen(false);
                }}
                style={styles.menuItem}
              >
                <Text style={[styles.menuLabel, value === sort && styles.menuLabelSelected]}>
                  {SORT_LABELS[value]}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  search: {
    color: colors.text,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  chips: { gap: 6 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  count: { flex: 1, textAlign: 'right', color: colors.muted, fontSize: 13 },
  menuScrim: { flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 48 },
  menu: { ...controlStyles.idle, borderRadius: 12, overflow: 'hidden' },
  menuItem: { paddingHorizontal: 16, paddingVertical: 14 },
  menuLabel: { color: colors.text, fontSize: 16 },
  menuLabelSelected: { color: colors.accent, fontWeight: '700' },
});
