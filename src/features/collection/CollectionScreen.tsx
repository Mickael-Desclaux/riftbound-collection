import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { collectionEntries } from '@/domain/collection';
import type { CatalogSort } from '@/domain/catalogSort';
import { PrintingBrowser } from '@/features/printing-browser/PrintingBrowser';
import { usePrintingEntries } from '@/features/printing-browser/usePrintingEntries';
import { Button } from '@/ui/controls';
import { colors } from '@/ui/theme';

const COLLECTION_SORTS: readonly CatalogSort[] = [
  'valueDesc',
  'number',
  'name',
  'priceAsc',
  'priceDesc',
  'change7dAsc',
  'change7dDesc',
  'change30dAsc',
  'change30dDesc',
];

/**
 * Onglet Collection (spec § 2.3) : la grille commune limitée aux Versions
 * possédées, triée par « Valeur » (quantité × prix). Les Versions inconnues
 * suivent, en fin de liste.
 */
export function CollectionScreen() {
  const router = useRouter();
  const { entries, owned } = usePrintingEntries();
  const collection = useMemo(() => collectionEntries(entries, owned), [entries, owned]);
  return (
    <PrintingBrowser
      tab="collection"
      entries={collection}
      sorts={COLLECTION_SORTS}
      defaultSort="valueDesc"
      showOwnershipFilter={false}
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
