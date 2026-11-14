import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DEFAULT_CATALOG_FILTERS, type CatalogFilters } from '@/domain/catalogFilters';
import { COLLECTION_SORTS } from '@/domain/catalogSort';
import { collectionEntries } from '@/domain/collection';
import { PrintingBrowser } from '@/features/printing-browser/PrintingBrowser';
import { usePrintingEntries } from '@/features/printing-browser/usePrintingEntries';
import { Button } from '@/ui/controls';
import { colors } from '@/ui/theme';

import { useToggleOwned } from './useToggleOwned';

/** Les promos possédées sont des cartes de la Collection comme les autres : visibles d'emblée. */
const COLLECTION_FILTERS: CatalogFilters = { ...DEFAULT_CATALOG_FILTERS, showPromo: true };

/**
 * Onglet Collection (spec § 2.3) : la grille commune limitée aux Versions
 * possédées, triée par « Valeur » (quantité × prix). Les Versions inconnues
 * suivent, en fin de liste.
 */
export function CollectionScreen() {
  const router = useRouter();
  const { entries, owned } = usePrintingEntries();
  const collection = useMemo(() => collectionEntries(entries, owned), [entries, owned]);
  const toggleOwned = useToggleOwned();
  return (
    <PrintingBrowser
      tab="collection"
      entries={collection}
      sorts={COLLECTION_SORTS}
      defaultSort="valueDesc"
      defaultFilters={COLLECTION_FILTERS}
      lockedCriteria={['promo', 'ownership']}
      onToggleOwned={toggleOwned}
      emptyState={
        <View style={styles.empty}>
          <Text style={styles.title}>Ta collection est vide.</Text>
          <Text style={styles.hint}>Marque tes cartes avec ✓ dans le Catalogue.</Text>
          <Button
            label="Parcourir le Catalogue"
            variant="primary"
            onPress={() => router.navigate('/catalog')}
          />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  title: { color: colors.text, fontSize: 17, fontWeight: '600' },
  hint: { color: colors.muted, fontSize: 14, textAlign: 'center' },
});
