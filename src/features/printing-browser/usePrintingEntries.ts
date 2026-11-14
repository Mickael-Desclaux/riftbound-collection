import { useMemo } from 'react';

import { CATALOG_ENTRY_TABLES, readCatalogEntries } from '@/data/catalogGrid';
import { COLLECTION_TABLES, readOwnedQuantities } from '@/data/collection';
import { useDatabase } from '@/data/DatabaseProvider';
import { readExchangeRates } from '@/data/exchangeRates';
import { readCurrentPrices, referenceMetricValuesOn } from '@/data/prices';
import { useReactiveQuery } from '@/data/useReactiveQuery';
import { useSetting } from '@/data/useSetting';
import {
  withOwnedQuantities,
  withPriceChanges,
  withPrices,
  type CatalogEntry,
  type ReferenceMetricValuesByDay,
} from '@/domain/catalogEntry';
import { addDays, toIsoDate } from '@/domain/dates';
import { useClock } from '@/ui/ClockContext';

/**
 * Toutes les Versions du Catalogue, avec quantité possédée, prix et Variation
 * de prix, relues quand la base change. `owned` contient aussi les Versions
 * inconnues (possédées mais absentes du Catalogue).
 */
export function usePrintingEntries(): { entries: CatalogEntry[]; owned: Map<string, number> } {
  const db = useDatabase();
  const catalog = useReactiveQuery(() => readCatalogEntries(db), [db], CATALOG_ENTRY_TABLES);
  const owned = useReactiveQuery(() => readOwnedQuantities(db), [db], COLLECTION_TABLES);
  const [displayCurrency] = useSetting('displayCurrency');
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
  return { entries, owned };
}
