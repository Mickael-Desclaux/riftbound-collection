import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { selectCatalogCount, selectCatalogPage, selectExpansionChips } from '@/data/catalogGrid';
import { useDatabase } from '@/data/DatabaseProvider';
import { DEFAULT_CATALOG_FILTERS, type CatalogFilters } from '@/domain/catalogFilters';
import { pageCount } from '@/domain/pagination';
import { PrintingGrid } from '@/ui/printing-grid/PrintingGrid';
import { colors } from '@/ui/theme';

const formatCount = new Intl.NumberFormat('fr-FR').format;

/** Onglet Catalogue : toutes les Versions, avec recherche, puces d'Extension et pagination. */
export function CatalogScreen() {
  const db = useDatabase();
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_CATALOG_FILTERS);
  const [page, setPage] = useState(1);
  const filtersKey = JSON.stringify(filters);

  const total = useLiveQuery(selectCatalogCount(db, filters), [filtersKey]).data[0]?.count ?? 0;
  const pages = pageCount(total);
  // Une page qui n'existe plus (le Catalogue a rétréci) ramène à la dernière.
  const currentPage = Math.min(page, pages);
  const printings = useLiveQuery(selectCatalogPage(db, filters, currentPage), [
    filtersKey,
    currentPage,
  ]);
  const chips = useLiveQuery(selectExpansionChips(db, filters.showPromo), [filters.showPromo]).data;

  // Préchargement des images de la page suivante (spec § 6).
  useEffect(() => {
    if (currentPage >= pages) return;
    const next = selectCatalogPage(db, filters, currentPage + 1).all();
    const urls = next.map((p) => p.imageNormal ?? p.imageSmall).filter((url) => url !== null);
    Image.prefetch(urls, 'disk').catch(() => {
      // Le préchargement n'est qu'une aide : l'image sera chargée à l'affichage.
    });
    // `filtersKey` résume `filters`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, filtersKey, currentPage, pages]);

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
        items={printings.data}
        loading={printings.updatedAt === undefined}
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

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
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
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipLabel: { color: colors.text, fontSize: 13 },
  chipLabelSelected: { color: colors.background, fontWeight: '600' },
  count: { color: colors.muted, fontSize: 13, paddingBottom: 8 },
});
