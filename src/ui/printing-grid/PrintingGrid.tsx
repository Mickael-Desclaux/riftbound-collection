import { useEffect, useRef, type ReactElement } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import type { Currency } from '@/domain/price';
import type { PrintingCode } from '@/domain/printingCode';
import { Button } from '@/ui/controls';
import { colors } from '@/ui/theme';

import type { GridPrinting } from './gridPrinting';
import { Pagination } from './Pagination';
import { PrintingTile } from './PrintingTile';

export type { GridPrinting } from './gridPrinting';

export type PrintingGridProps = {
  items: GridPrinting[];
  /** Devise des prix de `items`. */
  displayCurrency: Currency;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  onClearFilters: () => void;
  /** Toucher une case ouvre la fiche de sa Version. */
  onOpenPrinting: (printingCode: PrintingCode) => void;
  /** ✓ d'une case : bascule possédée / non possédée. */
  onToggleOwned: (printing: GridPrinting) => void;
  /** Affiché au-dessus de la grille (recherche, puces, compteur…). */
  header?: ReactElement;
  /** Tirer-pour-rafraîchir : force la mise à jour des données (spec § 5). */
  onRefresh?: () => void;
  refreshing?: boolean;
};

/**
 * Grille commune aux onglets Catalogue, Collection et Souhaits (spec § 2.1) :
 * 2 colonnes, pagination numérotée, retour en haut à chaque changement de page.
 */
export function PrintingGrid({
  items,
  displayCurrency,
  page,
  pageCount,
  onPageChange,
  onClearFilters,
  onOpenPrinting,
  onToggleOwned,
  header,
  onRefresh,
  refreshing = false,
}: Readonly<PrintingGridProps>) {
  const list = useRef<FlatList<GridPrinting>>(null);

  useEffect(() => {
    list.current?.scrollToOffset({ offset: 0, animated: false });
  }, [page]);

  return (
    <View style={styles.container}>
      {header}
      <FlatList
        ref={list}
        testID="printing-grid"
        data={items}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.accent]}
              progressBackgroundColor={colors.surface}
            />
          ) : undefined
        }
        keyExtractor={(item) => item.printingCode}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <PrintingTile
            printing={item}
            displayCurrency={displayCurrency}
            onPress={() => onOpenPrinting(item.printingCode)}
            onToggleOwned={() => onToggleOwned(item)}
          />
        )}
        ListEmptyComponent={<EmptyResult onClearFilters={onClearFilters} />}
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
      <Button label="Effacer les filtres" onPress={onClearFilters} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 12, gap: 12 },
  row: { gap: 12 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 48 },
  emptyText: { color: colors.muted, fontSize: 15 },
});
