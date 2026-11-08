import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { selectCatalogCount, selectCatalogPage, selectExpansionChips } from '@/data/catalogGrid';
import { useDatabase } from '@/data/DatabaseProvider';
import { useReactiveQuery } from '@/data/useReactiveQuery';
import { DEFAULT_CATALOG_FILTERS, type CatalogFilters } from '@/domain/catalogFilters';
import { pageCount } from '@/domain/pagination';
import { Chip } from '@/ui/controls';
import { gridImageUri } from '@/ui/printing-grid/gridPrinting';
import { PrintingGrid } from '@/ui/printing-grid/PrintingGrid';
import { colors } from '@/ui/theme';

const formatCount = new Intl.NumberFormat('fr-FR').format;

/** Tables lues par la grille du Catalogue (la requête les joint). */
const CATALOG_TABLES = ['printing', 'card', 'expansion'];

/** Onglet Catalogue : toutes les Versions, avec recherche, puces d'Extension et pagination. */
export function CatalogScreen() {
  const db = useDatabase();
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_CATALOG_FILTERS);
  const [page, setPage] = useState(1);

  const total = useReactiveQuery(
    () => selectCatalogCount(db, filters).get()?.count ?? 0,
    [db, filters],
    CATALOG_TABLES,
  );
  const pages = pageCount(total);
  // Le Catalogue a rétréci sous la page courante : on revient à la dernière page.
  if (page > pages) setPage(pages);
  const currentPage = Math.min(page, pages);

  const printings = useReactiveQuery(
    () => selectCatalogPage(db, filters, currentPage).all(),
    [db, filters, currentPage],
    CATALOG_TABLES,
  );
  const chips = useReactiveQuery(
    () => selectExpansionChips(db, filters.showPromo).all(),
    [db, filters.showPromo],
    ['expansion'],
  );

  // Préchargement des images de la page suivante (spec § 6).
  useEffect(() => {
    if (currentPage >= pages) return;
    const next = selectCatalogPage(db, filters, currentPage + 1).all();
    const urls = next.map(gridImageUri).filter((url) => url !== null);
    Image.prefetch(urls, 'disk').catch(() => {
      // Le préchargement n'est qu'une aide : l'image sera chargée à l'affichage.
    });
  }, [db, filters, currentPage, pages]);

  const updateFilters = (change: Partial<CatalogFilters>) => {
    setFilters({ ...filters, ...change });
    setPage(1);
  };
  const toggleExpansion = (code: string) => {
    const selected = filters.expansionCodes.includes(code);
    updateFilters({
      expansionCodes: selected
        ? filters.expansionCodes.filter((c) => c !== code)
        : [...filters.expansionCodes, code],
    });
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <PrintingGrid
        items={printings}
        page={currentPage}
        pageCount={pages}
        onPageChange={setPage}
        onClearFilters={() => updateFilters(DEFAULT_CATALOG_FILTERS)}
        header={
          <View style={styles.header}>
            <TextInput
              value={filters.search}
              onChangeText={(search) => updateFilters({ search })}
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
                onPress={() => updateFilters({ expansionCodes: [] })}
              />
              {chips.map((chip) => (
                <Chip
                  key={chip.code}
                  label={chip.name}
                  selected={filters.expansionCodes.includes(chip.code)}
                  onPress={() => toggleExpansion(chip.code)}
                />
              ))}
            </ScrollView>
            <Text style={styles.count}>
              {formatCount(total)} {total > 1 ? 'versions' : 'version'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
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
  count: { color: colors.muted, fontSize: 13, paddingBottom: 8 },
});
