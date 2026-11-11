import { StyleSheet, Text, View } from 'react-native';

import { CURRENCIES, PRICE_SOURCES, type Currency, type PriceSource } from '@/domain/price';
import { Chip } from '@/ui/controls';
import { PRICE_SOURCE_LABELS } from '@/ui/labels';
import { colors } from '@/ui/theme';

type Props = {
  displayCurrency: Currency;
  priceSource: PriceSource;
  onDisplayCurrencyChange: (currency: Currency) => void;
  onPriceSourceChange: (source: PriceSource) => void;
};

/** Réglages des prix (spec § 2.6) : Devise d'affichage et Source de prix. */
export function PriceSettings({
  displayCurrency,
  priceSource,
  onDisplayCurrencyChange,
  onPriceSourceChange,
}: Readonly<Props>) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Devise d’affichage</Text>
      <View style={styles.row}>
        {CURRENCIES.map((currency) => (
          <Chip
            key={currency}
            label={currency}
            selected={currency === displayCurrency}
            onPress={() => onDisplayCurrencyChange(currency)}
          />
        ))}
      </View>
      <Text style={styles.title}>Source de prix</Text>
      <View style={styles.row}>
        {PRICE_SOURCES.map((source) => (
          <Chip
            key={source}
            label={PRICE_SOURCE_LABELS[source]}
            selected={source === priceSource}
            onPress={() => onPriceSourceChange(source)}
          />
        ))}
      </View>
      <Text style={styles.hint}>Cardmarket : toutes langues et tous états confondus.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  title: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  hint: { color: colors.muted, fontSize: 13 },
});
