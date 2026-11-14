import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import {
  activeFilters,
  removeActiveFilter,
  type CatalogFilters,
  type LockedCriterion,
} from '@/domain/catalogFilters';
import type { Currency } from '@/domain/price';
import { controlStyles } from '@/ui/controls';
import { colors } from '@/ui/theme';

import type { FilterOptions } from './FilterSheet';
import { activeFilterLabel } from './filterLabels';

type Props = {
  filters: CatalogFilters;
  options: Pick<FilterOptions, 'expansions' | 'promoExpansions'>;
  displayCurrency: Currency;
  lockedCriteria: readonly LockedCriterion[];
  onChange: (filters: CatalogFilters) => void;
};

/** Puces des filtres actifs, sous l'en-tête : un toucher retire le filtre. */
export function ActiveFilterChips({
  filters,
  options,
  displayCurrency,
  lockedCriteria,
  onChange,
}: Readonly<Props>) {
  const active = activeFilters(filters, lockedCriteria);
  if (active.length === 0) return null;
  const expansions = [...options.expansions, ...options.promoExpansions];
  const expansionName = (code: string) => expansions.find((e) => e.code === code)?.name ?? code;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {active.map((filter) => {
        const label = activeFilterLabel(filter, expansionName, displayCurrency);
        return (
          <Pressable
            key={`${filter.criterion}:${JSON.stringify(filter.value)}`}
            accessibilityRole="button"
            accessibilityLabel={`Retirer le filtre ${label}`}
            onPress={() => onChange(removeActiveFilter(filters, filter))}
            style={styles.chip}
          >
            <Text style={styles.label}>{label} ✕</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 6 },
  chip: {
    ...controlStyles.idle,
    borderColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: { color: colors.accent, fontSize: 12 },
});
