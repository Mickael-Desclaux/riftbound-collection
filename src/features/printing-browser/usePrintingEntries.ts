import { useMemo } from 'react';

import { CATALOG_ENTRY_TABLES, readCatalogEntries } from '@/data/catalogGrid';
import { COLLECTION_TABLES, readOwnedQuantities } from '@/data/collection';
import { useDatabase } from '@/data/DatabaseProvider';
import { readExchangeRates } from '@/data/exchangeRates';
import {
  readCurrentPrices,
  readWishlistPriceHistory,
  referenceMetricValuesOn,
} from '@/data/prices';
import { useReactiveQuery } from '@/data/useReactiveQuery';
import { useSetting } from '@/data/useSetting';
import { readWishlist, WISHLIST_TABLES } from '@/data/wishlist';
import {
  withOwnedQuantities,
  withPriceChanges,
  withPrices,
  type CatalogEntry,
  type ReferenceMetricValuesByDay,
} from '@/domain/catalogEntry';
import { addDays, toIsoDate, type IsoDateTime } from '@/domain/dates';
import type { PrintingCode } from '@/domain/printingCode';
import { withWishlist } from '@/domain/wishlist';
import { useClock } from '@/ui/ClockContext';

/**
 * Toutes les Versions du Catalogue, avec quantité possédée, prix, Variation de
 * prix et souhait (variation depuis l'ajout comprise), relues quand la base
 * change. `owned` et `wishlist` contiennent aussi les Versions inconnues
 * (absentes du Catalogue).
 */
export function usePrintingEntries(): {
  entries: CatalogEntry[];
  owned: Map<PrintingCode, number>;
  wishlist: Map<PrintingCode, IsoDateTime>;
} {
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
  const wishlist = useReactiveQuery(() => readWishlist(db), [db], WISHLIST_TABLES);
  const wishlistHistory = useReactiveQuery(
    () => readWishlistPriceHistory(db, priceSource),
    [db, priceSource],
    ['price_record', ...WISHLIST_TABLES],
  );
  const today = toIsoDate(now());
  const entries = useMemo(
    () =>
      withWishlist(
        withPriceChanges(
          withPrices(withOwnedQuantities(catalog, owned), prices, displayCurrency, rates),
          values,
        ),
        wishlist,
        wishlistHistory,
        today,
      ),
    [catalog, owned, prices, displayCurrency, rates, values, wishlist, wishlistHistory, today],
  );
  return { entries, owned, wishlist };
}
