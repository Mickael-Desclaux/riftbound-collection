import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useSetting } from '@/data/useSetting';
import { DEFAULT_CATALOG_FILTERS, type CatalogFilters } from '@/domain/catalogFilters';
import { WISHLIST_SORTS } from '@/domain/catalogSort';
import { wishlistCost, wishlistEntries } from '@/domain/wishlist';
import { useOpenCatalog } from '@/features/catalog/catalogRequest';
import { useToggleOwned } from '@/features/collection/useToggleOwned';
import { PrintingBrowser } from '@/features/printing-browser/PrintingBrowser';
import { usePrintingEntries } from '@/features/printing-browser/usePrintingEntries';
import { Button } from '@/ui/controls';
import { formatWishlistCost } from '@/ui/format';
import { colors } from '@/ui/theme';

import { useToggleWishlisted } from './useToggleWishlisted';

/** Une promo en souhait se voit d'emblée, comme dans la Collection. */
const WISHLIST_FILTERS: CatalogFilters = { ...DEFAULT_CATALOG_FILTERS, showPromo: true };

/**
 * Onglet Souhaits (spec § 2.4) : « N cartes · coût total X », puis la grille
 * commune limitée aux souhaits, avec leur variation depuis l'ajout, triée par
 * plus forte baisse. Les Versions inconnues suivent, en fin de liste.
 */
export function WishlistScreen() {
  const openCatalog = useOpenCatalog();
  const { entries, owned, wishlist } = usePrintingEntries();
  const wished = useMemo(
    () => wishlistEntries(entries, wishlist, owned),
    [entries, wishlist, owned],
  );
  const toggleOwned = useToggleOwned();
  const toggleWishlisted = useToggleWishlisted();
  const [displayCurrency] = useSetting('displayCurrency');
  return (
    <PrintingBrowser
      tab="wishlist"
      entries={wished}
      sorts={WISHLIST_SORTS}
      defaultSort="wishlistChangeAsc"
      defaultFilters={WISHLIST_FILTERS}
      lockedCriteria={['promo']}
      onToggleOwned={toggleOwned}
      onToggleWishlisted={toggleWishlisted}
      showWishlistChange
      banner={
        <Text accessibilityRole="header" style={styles.summary}>
          {formatWishlistCost(wishlistCost(wished), displayCurrency)}
        </Text>
      }
      emptyState={
        <View style={styles.empty}>
          <Text style={styles.title}>Ta liste de souhaits est vide.</Text>
          <Text style={styles.hint}>
            Touche ♡ sur une carte du Catalogue pour suivre son prix depuis l’ajout.
          </Text>
          <Button label="Parcourir le Catalogue" variant="primary" onPress={() => openCatalog()} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  summary: { color: colors.text, fontSize: 15, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  title: { color: colors.text, fontSize: 17, fontWeight: '600' },
  hint: { color: colors.muted, fontSize: 14, textAlign: 'center' },
});
