import { useEffect, useRef, type ReactElement } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/ui/theme';

import { Pagination } from './Pagination';
import { PrintingTile } from './PrintingTile';

/** Ce qu'une case de grille affiche. */
export type GridPrinting = {
  printingCode: string;
  name: string;
  imageSmall: string | null;
  imageNormal?: string | null;
};

export type PrintingGridProps = {
  items: GridPrinting[];
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  onClearFilters: () => void;
  /** Vrai tant que la première lecture n'est pas arrivée : rien n'est affiché comme « vide ». */
  loading?: boolean;
  /** Affiché au-dessus de la grille (recherche, puces, compteur…). */
  header?: ReactElement;
};

/**
 * Grille commune aux onglets Catalogue, Collection et Souhaits (spec § 2.1) :
 * 2 colonnes, pagination numérotée, retour en haut à chaque changement de page.
 */
export function PrintingGrid({
  items,
  page,
  pageCount,
  onPageChange,
  onClearFilters,
  loading = false,
  header,
}: PrintingGridProps) {
  const list = useRef<FlatList<GridPrinting>>(null);

  useEffect(() => {
    list.current?.scrollToOffset({ offset: 0, animated: false });
  }, [page]);

  return (
    <View style={styles.container}>
      {header}
      <FlatList
        ref={list}
        data={items}
        keyExtractor={(item) => item.printingCode}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => <PrintingTile printing={item} />}
        ListEmptyComponent={loading ? undefined : <EmptyResult onClearFilters={onClearFilters} />}
        ListFooterComponent={
          <Pagination page={page} pageCount={pageCount} onPageChange={onPageChange} />
        }
      />
    </View>
  );
}

function EmptyResult({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>Aucune version ne correspond.</Text>
      <Pressable accessibilityRole="button" onPress={onClearFilters} style={styles.button}>
        <Text style={styles.buttonLabel}>Effacer les filtres</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 12, gap: 12 },
  row: { gap: 12 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 48 },
  emptyText: { color: colors.muted, fontSize: 15 },
  button: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonLabel: { color: colors.text, fontSize: 15 },
});
