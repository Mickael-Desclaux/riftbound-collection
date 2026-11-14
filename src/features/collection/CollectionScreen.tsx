import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { selectExpansionChips } from '@/data/catalogGrid';
import { useDatabase } from '@/data/DatabaseProvider';
import { readExchangeRates } from '@/data/exchangeRates';
import { readCollectionPriceHistory } from '@/data/prices';
import { useReactiveQuery } from '@/data/useReactiveQuery';
import { useSetting } from '@/data/useSetting';
import { DEFAULT_CATALOG_FILTERS, type CatalogFilters } from '@/domain/catalogFilters';
import { COLLECTION_SORTS } from '@/domain/catalogSort';
import { collectionEntries } from '@/domain/collection';
import { toIsoDate } from '@/domain/dates';
import { SOURCE_CURRENCY } from '@/domain/price';
import { useOpenCatalog } from '@/features/catalog/catalogRequest';
import { PrintingBrowser } from '@/features/printing-browser/PrintingBrowser';
import { usePrintingEntries } from '@/features/printing-browser/usePrintingEntries';
import { useClock } from '@/ui/ClockContext';
import { Button } from '@/ui/controls';
import { colors } from '@/ui/theme';

import { CollectionHeader } from './CollectionHeader';
import { useToggleOwned } from './useToggleOwned';

/** Les promos possédées sont des cartes de la Collection comme les autres : visibles d'emblée. */
const COLLECTION_FILTERS: CatalogFilters = { ...DEFAULT_CATALOG_FILTERS, showPromo: true };

/**
 * Onglet Collection (spec § 2.3) : la Valeur de la collection et la Complétion,
 * puis la grille commune limitée aux Versions possédées, triée par « Valeur »
 * (quantité × prix). Les Versions inconnues suivent, en fin de liste.
 */
export function CollectionScreen() {
  const openCatalog = useOpenCatalog();
  const { entries, owned } = usePrintingEntries();
  const collection = useMemo(() => collectionEntries(entries, owned), [entries, owned]);
  const toggleOwned = useToggleOwned();
  const db = useDatabase();
  const now = useClock();
  const [displayCurrency] = useSetting('displayCurrency');
  const [priceSource] = useSetting('priceSource');
  const history = useReactiveQuery(
    () => readCollectionPriceHistory(db, priceSource),
    [db, priceSource],
    ['price_record', 'collection_entry'],
  );
  const rates = useReactiveQuery(() => readExchangeRates(db), [db], ['exchange_rate']);
  const expansionNames = useReactiveQuery(
    () =>
      new Map(
        selectExpansionChips(db, false)
          .all()
          .map((expansion) => [expansion.code, expansion.name]),
      ),
    [db],
    ['expansion'],
  );
  return (
    <PrintingBrowser
      tab="collection"
      entries={collection}
      sorts={COLLECTION_SORTS}
      defaultSort="valueDesc"
      defaultFilters={COLLECTION_FILTERS}
      lockedCriteria={['promo', 'ownership']}
      onToggleOwned={toggleOwned}
      banner={
        <CollectionHeader
          owned={collection}
          catalog={entries}
          expansionNames={expansionNames}
          history={history}
          sourceCurrency={SOURCE_CURRENCY[priceSource]}
          displayCurrency={displayCurrency}
          rates={rates}
          today={toIsoDate(now())}
          onOpenCompletion={(expansionCode) =>
            openCatalog({
              ...DEFAULT_CATALOG_FILTERS,
              expansionCodes: [expansionCode],
              ownership: 'missing',
            })
          }
        />
      }
      emptyState={
        <View style={styles.empty}>
          <Text style={styles.title}>Ta collection est vide.</Text>
          <Text style={styles.hint}>Marque tes cartes avec ✓ dans le Catalogue.</Text>
          <Button label="Parcourir le Catalogue" variant="primary" onPress={() => openCatalog()} />
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
