import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useDatabase } from '@/data/DatabaseProvider';
import { readExchangeRates } from '@/data/exchangeRates';
import {
  PRINTING_DETAIL_TABLES,
  PRINTING_STATE_TABLES,
  readPrintingDetail,
  readPrintingState,
  setInBinderSelection,
  setOwnedQuantity,
  setWishlisted,
} from '@/data/printingDetail';
import { useReactiveQuery } from '@/data/useReactiveQuery';
import { useSetting } from '@/data/useSetting';
import type { PrintingCode } from '@/domain/printingCode';
import { useClock } from '@/ui/ClockContext';
import { Button } from '@/ui/controls';
import { colors } from '@/ui/theme';

import { PrintingDetailView } from './PrintingDetailView';
import { printingHref, type PrintingTab } from './printingHref';

/** Fiche d'une Version, ouverte dans la pile de l'onglet courant. */
export function PrintingDetailScreen() {
  const { printingCode } = useLocalSearchParams<{ printingCode: string }>();
  const code = printingCode as PrintingCode;
  const db = useDatabase();
  const now = useClock();
  const router = useRouter();
  // « (tabs) / catalog / [printingCode] » : l'onglet est le 2ᵉ segment.
  const tab = useSegments()[1] as PrintingTab;
  const [displayCurrency] = useSetting('displayCurrency');
  const [priceSource] = useSetting('priceSource');
  const detail = useReactiveQuery(
    () => readPrintingDetail(db, code),
    [db, code],
    PRINTING_DETAIL_TABLES,
  );
  const state = useReactiveQuery(
    () => readPrintingState(db, code),
    [db, code],
    PRINTING_STATE_TABLES,
  );
  const rates = useReactiveQuery(() => readExchangeRates(db), [db], ['exchange_rate']);

  if (!detail) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>Cette version n’est pas dans le catalogue.</Text>
        <Button label="Retour" onPress={() => router.back()} />
      </View>
    );
  }
  return (
    <PrintingDetailView
      // Une autre Version repart de sa propre case de prix.
      key={code}
      detail={detail}
      state={state}
      displayCurrency={displayCurrency}
      priceSource={priceSource}
      rates={rates}
      onBack={() => router.back()}
      onOpenPrinting={(other) => router.push(printingHref(tab, other))}
      onOpenUrl={(url) => void Linking.openURL(url)}
      onQuantityChange={(quantity) => setOwnedQuantity(db, code, quantity)}
      onWishlistChange={(wished) => setWishlisted(db, code, wished ? now().toISOString() : null)}
      onBinderSelectionChange={(selected) => setInBinderSelection(db, code, selected)}
    />
  );
}

const styles = StyleSheet.create({
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
    backgroundColor: colors.background,
  },
  missingText: { color: colors.text, fontSize: 16, textAlign: 'center' },
});
