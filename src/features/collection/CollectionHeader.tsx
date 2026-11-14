import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CatalogEntry } from '@/domain/catalogEntry';
import {
  collectionValue,
  collectionValueChange,
  collectionValueSeries,
  firstHoldingRecordDay,
  holdingsOf,
  type Holding,
  type HoldingHistory,
} from '@/domain/collectionValue';
import { completion } from '@/domain/completion';
import type { IsoDate } from '@/domain/dates';
import type { ExchangeRate } from '@/domain/exchangeRates';
import type { Currency } from '@/domain/price';
import { alignSeries, convertSeries, isHistoryBuilding, periodRange } from '@/domain/priceHistory';
import { CHART_PRESET_PERIODS, type ChartPresetPeriod } from '@/domain/settings';
import { Chip } from '@/ui/controls';
import {
  formatCollectionCounts,
  formatCompletion,
  formatIsoDate,
  formatPercentChange,
  formatPrice,
} from '@/ui/format';
import { CHART_PERIOD_LABELS } from '@/ui/labels';
import { PriceLineChart } from '@/ui/PriceLineChart';
import { colors } from '@/ui/theme';

export type CollectionHeaderProps = {
  /** Les Versions de la Collection, Versions inconnues comprises, avec leur prix. */
  owned: readonly CatalogEntry[];
  /** Toutes les Versions du Catalogue, pour la Complétion. */
  catalog: readonly CatalogEntry[];
  /** Nom de chaque Extension, par code. */
  expansionNames: ReadonlyMap<string, string>;
  /** Les Relevés de prix des Versions possédées, pour la Source de prix choisie. */
  history: HoldingHistory;
  /** Devise d'origine de la Source de prix choisie. */
  sourceCurrency: Currency;
  displayCurrency: Currency;
  rates: readonly ExchangeRate[];
  today: IsoDate;
  /** Toucher une ligne de Complétion : le Catalogue, filtré sur l'Extension et « Manquantes ». */
  onOpenCompletion: (expansionCode: string) => void;
};

/**
 * En-tête de l'onglet Collection (spec § 2.3) : la Valeur de la collection et
 * sa variation sur 30 j ; toucher l'en-tête déplie le graphique de la valeur
 * des cartes possédées aujourd'hui. En dessous, la Complétion par Extension
 * principale, repliable.
 */
export function CollectionHeader({
  owned,
  catalog,
  expansionNames,
  history,
  sourceCurrency,
  displayCurrency,
  rates,
  today,
  onOpenCompletion,
}: Readonly<CollectionHeaderProps>) {
  const [chartOpen, setChartOpen] = useState(false);
  const [completionOpen, setCompletionOpen] = useState(false);
  const summary = collectionValue(owned);
  const holdings = useMemo(() => holdingsOf(owned), [owned]);
  const change = useMemo(
    () => collectionValueChange(holdings, history, today),
    [holdings, history, today],
  );
  const completions = useMemo(() => completion(catalog), [catalog]);

  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: chartOpen }}
        accessibilityHint="Affiche l'évolution de la valeur"
        onPress={() => setChartOpen((open) => !open)}
        style={styles.value}
      >
        <View style={styles.valueLine}>
          <Text style={styles.amount}>{formatPrice(summary.value, displayCurrency)}</Text>
          <Text style={styles.change}>
            {change === null
              ? '30 j : pas encore d’historique'
              : `${formatPercentChange(change)} sur 30 j`}
          </Text>
          <Text style={styles.chevron}>{chartOpen ? '▴' : '▾'}</Text>
        </View>
        <Text style={styles.counts}>{formatCollectionCounts(summary)}</Text>
      </Pressable>

      {chartOpen && (
        <ValueChart
          holdings={holdings}
          history={history}
          sourceCurrency={sourceCurrency}
          displayCurrency={displayCurrency}
          rates={rates}
          today={today}
        />
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: completionOpen }}
        onPress={() => setCompletionOpen((open) => !open)}
        style={styles.sectionTitle}
      >
        <Text style={styles.sectionLabel}>Complétion</Text>
        <Text style={styles.chevron}>{completionOpen ? '▴' : '▾'}</Text>
      </Pressable>
      {completionOpen &&
        completions.map((expansion) => {
          const name = expansionNames.get(expansion.expansionCode) ?? expansion.expansionCode;
          return (
            <Pressable
              key={expansion.expansionCode}
              accessibilityRole="button"
              accessibilityHint={`Montre dans le Catalogue les cartes de ${name} qui te manquent`}
              onPress={() => onOpenCompletion(expansion.expansionCode)}
              style={styles.completion}
            >
              <Text style={styles.completionName} numberOfLines={1}>
                {name.toLocaleUpperCase('fr-FR')}
              </Text>
              <Text style={styles.completionValue}>{formatCompletion(expansion)}</Text>
            </Pressable>
          );
        })}
    </View>
  );
}

type ValueChartProps = Pick<
  CollectionHeaderProps,
  'history' | 'sourceCurrency' | 'displayCurrency' | 'rates' | 'today'
> & { holdings: readonly Holding[] };

/**
 * Graphique de la valeur des cartes possédées aujourd'hui : chaque jour,
 * quantité × Relevé de prix, en devise d'origine puis converti au taux de sa
 * date (spec § 3).
 */
function ValueChart({
  holdings,
  history,
  sourceCurrency,
  displayCurrency,
  rates,
  today,
}: Readonly<ValueChartProps>) {
  const [period, setPeriod] = useState<ChartPresetPeriod>('30d');
  const firstDay = useMemo(() => firstHoldingRecordDay(holdings, history), [holdings, history]);
  const range = useMemo(() => periodRange(period, today, firstDay), [period, today, firstDay]);
  const points = useMemo(
    () =>
      convertSeries(
        collectionValueSeries(holdings, history, range),
        sourceCurrency,
        displayCurrency,
        rates,
      ),
    [holdings, history, range, sourceCurrency, displayCurrency, rates],
  );

  return (
    <View style={styles.chart}>
      <View style={styles.periods}>
        {CHART_PRESET_PERIODS.map((preset) => (
          <Chip
            key={preset}
            label={CHART_PERIOD_LABELS[preset]}
            selected={period === preset}
            onPress={() => setPeriod(preset)}
          />
        ))}
      </View>
      {points.length === 0 ? (
        <Text style={styles.note}>Pas encore de prix pour tes cartes sur cette période.</Text>
      ) : (
        <PriceLineChart
          days={alignSeries(points, undefined)}
          compare={false}
          displayCurrency={displayCurrency}
        />
      )}
      <Text style={styles.note}>
        Valeur des cartes que tu possèdes aujourd’hui, pas l’historique de tes achats.
      </Text>
      {firstDay && isHistoryBuilding(range, firstDay) && (
        <Text style={styles.note}>
          Historique en cours de constitution : premier relevé le {formatIsoDate(firstDay)}.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 6 },
  value: { gap: 2 },
  valueLine: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  amount: { color: colors.text, fontSize: 22, fontWeight: '700' },
  change: { flex: 1, color: colors.muted, fontSize: 13 },
  chevron: { color: colors.muted, fontSize: 14 },
  counts: { color: colors.muted, fontSize: 13 },
  chart: { gap: 8 },
  periods: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  note: { color: colors.muted, fontSize: 12 },
  sectionTitle: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  sectionLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  completion: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 6 },
  completionName: { flex: 1, color: colors.text, fontSize: 14 },
  completionValue: { color: colors.muted, fontSize: 14 },
});
