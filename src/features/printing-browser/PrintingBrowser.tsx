import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { addToBinderSelection, removeFromBinderSelection } from '@/data/binder';
import { CATALOG_ENTRY_TABLES, readFilterOptions, selectExpansionChips } from '@/data/catalogGrid';
import { useDatabase } from '@/data/DatabaseProvider';
import { useReactiveQuery } from '@/data/useReactiveQuery';
import { useSetting } from '@/data/useSetting';
import type { CatalogEntry } from '@/domain/catalogEntry';
import {
  activeFilters,
  DEFAULT_CATALOG_FILTERS,
  filterCatalog,
  toggled,
  type CatalogFilters,
  type LockedCriterion,
} from '@/domain/catalogFilters';
import { sortCatalog, type CatalogSort } from '@/domain/catalogSort';
import { pageCount, pageOf } from '@/domain/pagination';
import { Chip, controlStyles } from '@/ui/controls';
import { formatBinderAdded, formatPrintingCount } from '@/ui/format';
import { gridImageUri, type GridPrinting } from '@/ui/printing-grid/gridPrinting';
import { PrintingGrid } from '@/ui/printing-grid/PrintingGrid';
import { printingHref, type PrintingTab } from '@/ui/printingHref';
import { useSync } from '@/ui/SyncContext';
import { useToast } from '@/ui/Toast';
import { colors } from '@/ui/theme';

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
  valueDesc: 'Valeur',
  wishlistChangeAsc: 'Plus forte baisse',
};

const NO_LOCKED_CRITERIA: readonly LockedCriterion[] = [];

type Props = {
  /** L'onglet, dont la pile ouvre la fiche. */
  tab: PrintingTab;
  /** Les Versions de cet onglet, avant filtres et tri. */
  entries: CatalogEntry[];
  /** Les tris proposés, dans l'ordre du menu. */
  sorts: readonly CatalogSort[];
  defaultSort: CatalogSort;
  /** Filtres à l'ouverture de l'onglet, et après « Effacer les filtres ». */
  defaultFilters?: CatalogFilters;
  /**
   * Critères que l'onglet fixe par `defaultFilters` : la Collection montre
   * toujours ses promos, et « possédées / manquantes » n'y a pas de sens.
   */
  lockedCriteria?: readonly LockedCriterion[];
  /** ✓ d'une case : bascule possédée / non possédée. */
  onToggleOwned: (printing: GridPrinting) => void;
  /** ♡ d'une case : ajoute aux souhaits ou en retire. */
  onToggleWishlisted: (printing: GridPrinting) => void;
  /** Onglet Souhaits : chaque case montre sa variation depuis l'ajout. */
  showWishlistChange?: boolean;
  /** Affiché à la place de la grille quand l'onglet n'a aucune Version. */
  emptyState?: ReactElement;
  /** Affiché en haut de l'en-tête, au-dessus de la recherche. */
  banner?: ReactElement;
  /**
   * Filtres demandés de l'extérieur (un lien vers l'onglet). Chaque nouvel
   * objet remplace les filtres en cours, une seule fois.
   */
  filtersRequest?: CatalogFilters | null;
};

/**
 * Grille commune (spec § 2.1) : recherche, puces d'Extension, feuille de
 * filtres, tri et pagination sur les Versions d'un onglet. Filtres, tri et page
 * vivent ici, dans l'écran de l'onglet, qui reste monté quand une fiche s'ouvre
 * par-dessus (Stack de l'onglet).
 */
export function PrintingBrowser({
  tab,
  entries,
  sorts,
  defaultSort,
  defaultFilters = DEFAULT_CATALOG_FILTERS,
  lockedCriteria = NO_LOCKED_CRITERIA,
  onToggleOwned,
  onToggleWishlisted,
  showWishlistChange = false,
  emptyState,
  banner,
  filtersRequest = null,
}: Readonly<Props>) {
  const db = useDatabase();
  const [filters, setFilters] = useState<CatalogFilters>(defaultFilters);
  const [sort, setSort] = useState<CatalogSort>(defaultSort);
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [appliedRequest, setAppliedRequest] = useState<CatalogFilters | null>(null);
  if (filtersRequest && filtersRequest !== appliedRequest) {
    setAppliedRequest(filtersRequest);
    setFilters(filtersRequest);
    setPage(1);
  }
  const { refresh } = useSync();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => {
    setRefreshing(true);
    void refresh().finally(() => setRefreshing(false));
  };

  const [displayCurrency] = useSetting('displayCurrency');
  // Une fourchette de prix est exprimée dans la Devise d'affichage : elle n'a
  // plus de sens dans une autre devise, on la retire.
  const [rangeCurrency, setRangeCurrency] = useState(displayCurrency);
  if (rangeCurrency !== displayCurrency) {
    setRangeCurrency(displayCurrency);
    setFilters((current) => ({ ...current, priceRange: defaultFilters.priceRange }));
  }
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
  const activeCount = activeFilters(filters, lockedCriteria).length;
  const showToast = useToast();
  const addResultsToBinder = () => {
    const added = addToBinderSelection(
      db,
      results.map((entry) => entry.printingCode),
    );
    setSheetOpen(false);
    if (added.length === 0) {
      showToast({ message: 'Déjà toutes dans le classeur' });
      return;
    }
    showToast({
      message: formatBinderAdded(added.length),
      actionLabel: 'Annuler',
      onAction: () => removeFromBinderSelection(db, added),
    });
  };

  if (entries.length === 0 && emptyState) {
    return (
      <SafeAreaView edges={['top']} style={styles.screen}>
        {emptyState}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <PrintingGrid
        items={items}
        displayCurrency={displayCurrency}
        page={currentPage}
        pageCount={pages}
        onPageChange={setPage}
        onClearFilters={() => changeFilters(defaultFilters)}
        onOpenPrinting={(code) => router.push(printingHref(tab, code))}
        onToggleOwned={onToggleOwned}
        onToggleWishlisted={onToggleWishlisted}
        showWishlistChange={showWishlistChange}
        onRefresh={onRefresh}
        refreshing={refreshing}
        header={
          <View style={styles.header}>
            {banner}
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
              <SortMenu sorts={sorts} sort={sort} onChange={changeSort} />
              <Text style={styles.count}>{formatPrintingCount(results.length)}</Text>
            </View>
            <ActiveFilterChips
              filters={filters}
              options={options}
              displayCurrency={displayCurrency}
              lockedCriteria={lockedCriteria}
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
        defaultFilters={defaultFilters}
        lockedCriteria={lockedCriteria}
        onChange={changeFilters}
        onClose={() => setSheetOpen(false)}
        onAddToBinder={addResultsToBinder}
      />
    </SafeAreaView>
  );
}

/** Menu de tri : un bouton qui ouvre la liste des tris. */
function SortMenu({
  sorts,
  sort,
  onChange,
}: Readonly<{
  sorts: readonly CatalogSort[];
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
            {sorts.map((value) => (
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
