/**
 * Courbe d'évolution d'un prix (spec § 2.2), seule à connaître
 * react-native-gifted-charts. Les points sont espacés régulièrement : un par
 * jour, la valeur étant prolongée entre deux relevés (courbe en escalier).
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import type { ChartDay } from '@/domain/priceHistory';
import type { Currency } from '@/domain/price';

import { formatIsoDate, formatPrice } from './format';
import { colors } from './theme';

export type PriceLineChartProps = {
  /** Un élément par jour, dans la Devise d'affichage. */
  days: ChartDay[];
  /** Trace aussi l'autre Source de prix, en pointillés. */
  compare: boolean;
  displayCurrency: Currency;
};

const HEIGHT = 180;
const Y_AXIS_WIDTH = 52;

type ChartItem = { value: number; date: string; price: number | null };

/**
 * Une série telle que la bibliothèque la veut : une valeur à chaque jour.
 * Les jours qui précèdent sa première valeur sont masqués par `startIndex`.
 */
function toChartSeries(days: ChartDay[], valueOf: (day: ChartDay) => number | null) {
  const startIndex = Math.max(
    0,
    days.findIndex((day) => valueOf(day) !== null),
  );
  const first = valueOf(days[startIndex] as ChartDay) ?? 0;
  const data: ChartItem[] = days.map((day) => ({
    value: valueOf(day) ?? first,
    date: day.date,
    price: valueOf(day),
  }));
  return { data, startIndex };
}

export function PriceLineChart({ days, compare, displayCurrency }: Readonly<PriceLineChartProps>) {
  const [width, setWidth] = useState(0);
  const shown = toChartSeries(days, (day) => day.value);
  const other = compare ? toChartSeries(days, (day) => day.compareValue) : undefined;
  const values = days.flatMap((day) => [day.value ?? 0, compare ? (day.compareValue ?? 0) : 0]);
  const max = Math.max(...values, 0);

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 && (
        <LineChart
          data={shown.data}
          startIndex1={shown.startIndex}
          data2={other?.data}
          startIndex2={other?.startIndex}
          stepChart
          adjustToWidth
          width={width - Y_AXIS_WIDTH - 8}
          height={HEIGHT}
          maxValue={max * 1.1 || 1}
          noOfSections={4}
          hideDataPoints
          initialSpacing={0}
          endSpacing={0}
          thickness={2}
          color1={colors.accent}
          color2={colors.muted}
          strokeDashArray2={[6, 4]}
          yAxisLabelWidth={Y_AXIS_WIDTH}
          yAxisTextStyle={styles.axis}
          formatYLabel={(label) => formatPrice(Number(label), displayCurrency)}
          yAxisColor={colors.line}
          xAxisColor={colors.line}
          rulesColor={colors.line}
          pointerConfig={{
            pointerColor: colors.accent,
            pointerStripColor: colors.muted,
            radius: 4,
            pointerLabelWidth: 120,
            autoAdjustPointerLabelPosition: true,
            pointerLabelComponent: (items: ChartItem[]) => (
              <View style={styles.pointer}>
                {items[0]?.date && (
                  <Text style={styles.pointerDate}>{formatIsoDate(items[0].date)}</Text>
                )}
                <Text style={styles.pointerPrice}>
                  {formatPrice(items[0]?.price ?? null, displayCurrency)}
                </Text>
              </View>
            ),
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  axis: { color: colors.muted, fontSize: 10 },
  pointer: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 8,
    padding: 6,
  },
  pointerDate: { color: colors.muted, fontSize: 11 },
  pointerPrice: { color: colors.text, fontSize: 13, fontWeight: '600' },
});
