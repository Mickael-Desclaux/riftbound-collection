import { StyleSheet, Switch, Text, View } from 'react-native';

import type { IsoDate } from '@/domain/dates';
import type { ExchangeRate } from '@/domain/exchangeRates';
import type { Currency, Finish, PriceSource } from '@/domain/price';
import {
  convertSeries,
  dailySeries,
  firstRecordDay,
  isHistoryBuilding,
  percentChange,
  periodRange,
  type HistoryRecord,
} from '@/domain/priceHistory';
import { CHART_PRESET_PERIODS, type ChartPeriod, type ChartPresetPeriod } from '@/domain/settings';
import { Chip } from '@/ui/controls';
import { formatIsoDate, formatPercentChange, formatShortIsoDate } from '@/ui/format';
import { FINISH_LABELS, PRICE_SOURCE_LABELS } from '@/ui/labels';
import { PriceLineChart } from '@/ui/PriceLineChart';
import { colors } from '@/ui/theme';

const PERIOD_LABELS: Record<ChartPresetPeriod, string> = {
  '7d': '7 j',
  '30d': '30 j',
  '90d': '90 j',
  '1y': '1 an',
  all: 'Tout',
};

export type PriceHistorySectionProps = {
  /** La case de prix affichée : son historique, dans la devise d'origine. */
  source: PriceSource;
  finish: Finish;
  history: HistoryRecord[] | undefined;
  currency: Currency;
  /** L'autre Source de prix, même Finition, pour « Comparer avec… ». */
  otherSource: PriceSource;
  otherHistory: HistoryRecord[] | undefined;
  otherCurrency: Currency;
  displayCurrency: Currency;
  rates: readonly ExchangeRate[];
  today: IsoDate;
  period: ChartPeriod;
  onPeriodChange: (period: ChartPeriod) => void;
  compare: boolean;
  onCompareChange: (compare: boolean) => void;
  /** Ouvre le choix des dates ; `null` si l'utilisateur renonce. */
  pickDates: () => Promise<{ from: IsoDate; to: IsoDate } | null>;
};

/**
 * Graphique d'évolution de la fiche (spec § 2.2) : courbe en escalier de la
 * case de prix affichée, chaque jour converti au taux de sa date, et la
 * variation sur la période, calculée dans la devise d'origine (spec § 3).
 */
export function PriceHistorySection({
  source,
  finish,
  history,
  currency,
  otherSource,
  otherHistory,
  otherCurrency,
  displayCurrency,
  rates,
  today,
  period,
  onPeriodChange,
  compare,
  onCompareChange,
  pickDates,
}: Readonly<PriceHistorySectionProps>) {
  const firstDay = history && firstRecordDay(history);
  const range = periodRange(period, today, firstDay);
  const original = history ? dailySeries(history, range) : [];
  const points = convertSeries(original, currency, displayCurrency, rates);
  const change = percentChange(original[0]?.value ?? null, original.at(-1)?.value ?? null);

  const otherPoints =
    compare && otherHistory
      ? convertSeries(dailySeries(otherHistory, range), otherCurrency, displayCurrency, rates)
      : undefined;
  const compareStartIndex = otherPoints?.[0]
    ? Math.max(
        0,
        points.findIndex((p) => p.date === otherPoints[0]?.date),
      )
    : 0;

  const chooseDates = () => {
    void pickDates().then((dates) => {
      if (dates) onPeriodChange(dates);
    });
  };

  return (
    <View style={styles.section}>
      <View style={styles.periods}>
        {CHART_PRESET_PERIODS.map((preset) => (
          <Chip
            key={preset}
            label={PERIOD_LABELS[preset]}
            selected={period === preset}
            onPress={() => onPeriodChange(preset)}
          />
        ))}
        <Chip
          label={
            typeof period === 'object'
              ? `${formatShortIsoDate(period.from)} – ${formatShortIsoDate(period.to)}`
              : 'Dates…'
          }
          selected={typeof period === 'object'}
          onPress={chooseDates}
        />
      </View>

      {points.length === 0 ? (
        <Text style={styles.note}>
          Pas de prix {PRICE_SOURCE_LABELS[source]} {FINISH_LABELS[finish]} sur cette période.
        </Text>
      ) : (
        <>
          {change !== null && (
            <Text style={styles.change}>{formatPercentChange(change)} sur la période</Text>
          )}
          <PriceLineChart
            points={points}
            comparePoints={otherPoints}
            compareStartIndex={compareStartIndex}
            displayCurrency={displayCurrency}
          />
          {firstDay && isHistoryBuilding(range, firstDay) && (
            <Text style={styles.note}>
              Historique en cours de constitution : premier relevé le {formatIsoDate(firstDay)}.
            </Text>
          )}
        </>
      )}

      {otherHistory && otherHistory.length > 0 && (
        <View style={styles.compare}>
          <Text style={styles.compareLabel}>Comparer avec {PRICE_SOURCE_LABELS[otherSource]}</Text>
          <Switch
            accessibilityLabel={`Comparer avec ${PRICE_SOURCE_LABELS[otherSource]}`}
            value={compare}
            onValueChange={onCompareChange}
            trackColor={{ true: colors.accent, false: colors.line }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  periods: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  change: { color: colors.text, fontSize: 14, fontWeight: '600' },
  note: { color: colors.muted, fontSize: 12 },
  compare: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  compareLabel: { color: colors.text, fontSize: 14 },
});
