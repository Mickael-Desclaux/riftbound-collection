/**
 * Courbe d'évolution d'un prix (spec § 2.2), seule à connaître
 * react-native-gifted-charts. Les points sont espacés régulièrement : un par
 * jour, la valeur étant prolongée entre deux relevés (courbe en escalier).
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import type { DailyPoint } from '@/domain/priceHistory';
import type { Currency } from '@/domain/price';

import { formatIsoDate, formatPrice } from './format';
import { colors } from './theme';

export type PriceLineChartProps = {
  /** Prix de la case choisie, dans la Devise d'affichage. */
  points: DailyPoint[];
  /** Autre Source de prix, en pointillés, à partir de `compareStartIndex`. */
  comparePoints?: DailyPoint[];
  compareStartIndex?: number;
  displayCurrency: Currency;
};

const HEIGHT = 180;
const Y_AXIS_WIDTH = 52;

export function PriceLineChart({
  points,
  comparePoints,
  compareStartIndex = 0,
  displayCurrency,
}: Readonly<PriceLineChartProps>) {
  const [width, setWidth] = useState(0);
  const data = points.map((p) => ({ value: p.value, date: p.date }));
  // La bibliothèque aligne les séries par rang : la comparaison commence plus loin.
  const data2 = comparePoints && [
    ...Array.from({ length: compareStartIndex }, () => ({ value: comparePoints[0]?.value ?? 0 })),
    ...comparePoints.map((p) => ({ value: p.value, date: p.date })),
  ];
  const values = [...points, ...(comparePoints ?? [])].map((p) => p.value);
  const max = Math.max(...values, 0);

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 && (
        <LineChart
          data={data}
          data2={data2}
          startIndex2={data2 ? compareStartIndex : undefined}
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
            pointerLabelComponent: (items: { value: number; date?: string }[]) => (
              <View style={styles.pointer}>
                {items[0]?.date && (
                  <Text style={styles.pointerDate}>{formatIsoDate(items[0].date)}</Text>
                )}
                <Text style={styles.pointerPrice}>
                  {formatPrice(items[0]?.value ?? null, displayCurrency)}
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
