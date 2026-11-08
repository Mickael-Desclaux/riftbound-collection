import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { PrintingVariant } from '@/domain/catalog';
import {
  DEFAULT_CATALOG_FILTERS,
  toggled,
  withPromoShown,
  type CatalogFilters,
  type Ownership,
} from '@/domain/catalogFilters';
import { Button, Chip } from '@/ui/controls';
import { formatPrintingCount } from '@/ui/format';
import { colors } from '@/ui/theme';

import {
  domainLabel,
  orderedDomains,
  orderedRarities,
  orderedTypes,
  rarityLabel,
  typeLabel,
  VARIANTS,
} from './filterLabels';

export type FilterOptions = {
  expansions: { code: string; name: string }[];
  promoExpansions: { code: string; name: string }[];
  rarities: string[];
  types: string[];
  domains: string[];
};

type Props = {
  visible: boolean;
  filters: CatalogFilters;
  options: FilterOptions;
  /** Nombre de Versions qui correspondent aux filtres en cours. */
  resultCount: number;
  onChange: (filters: CatalogFilters) => void;
  onClose: () => void;
};

const OWNERSHIP: { value: Ownership; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'owned', label: 'Possédées' },
  { value: 'missing', label: 'Manquantes' },
];

/**
 * Feuille de filtres (spec § 2.1), qui monte du bas. Les choix s'appliquent
 * tout de suite ; « Voir N versions » referme la feuille.
 */
export function FilterSheet({
  visible,
  filters,
  options,
  resultCount,
  onChange,
  onClose,
}: Readonly<Props>) {
  const update = (change: Partial<CatalogFilters>) => onChange({ ...filters, ...change });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable accessibilityLabel="Fermer les filtres" onPress={onClose} style={styles.scrim} />
      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <ScrollView contentContainerStyle={styles.content}>
          <Section title="Extension">
            {options.expansions.map((e) => (
              <Chip
                key={e.code}
                label={e.name}
                selected={filters.expansionCodes.includes(e.code)}
                onPress={() => update({ expansionCodes: toggled(filters.expansionCodes, e.code) })}
              />
            ))}
          </Section>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Afficher les extensions promo</Text>
            <Switch
              accessibilityLabel="Afficher les extensions promo"
              value={filters.showPromo}
              onValueChange={(shown) => onChange(withPromoShown(filters, shown))}
              trackColor={{ true: colors.accent, false: colors.line }}
            />
          </View>
          {filters.showPromo && (
            <View style={styles.chips}>
              {options.promoExpansions.map((e) => (
                <Chip
                  key={e.code}
                  label={e.name}
                  selected={filters.expansionCodes.includes(e.code)}
                  onPress={() =>
                    update({ expansionCodes: toggled(filters.expansionCodes, e.code) })
                  }
                />
              ))}
            </View>
          )}
          <Section title="Rareté">
            {orderedRarities(options.rarities).map((value) => (
              <Chip
                key={value}
                label={rarityLabel(value)}
                selected={filters.rarities.includes(value)}
                onPress={() => update({ rarities: toggled(filters.rarities, value) })}
              />
            ))}
          </Section>
          <Section title="Version">
            {(Object.keys(VARIANTS) as PrintingVariant[]).map((value) => (
              <Chip
                key={value}
                label={VARIANTS[value]}
                selected={filters.variants.includes(value)}
                onPress={() => update({ variants: toggled(filters.variants, value) })}
              />
            ))}
          </Section>
          <Section title="Type">
            {orderedTypes(options.types).map((value) => (
              <Chip
                key={value}
                label={typeLabel(value)}
                selected={filters.types.includes(value)}
                onPress={() => update({ types: toggled(filters.types, value) })}
              />
            ))}
          </Section>
          <Section title="Domaine">
            {orderedDomains(options.domains).map((value) => (
              <Chip
                key={value}
                label={domainLabel(value)}
                selected={filters.domains.includes(value)}
                onPress={() => update({ domains: toggled(filters.domains, value) })}
              />
            ))}
          </Section>
          <Section title="Collection">
            {OWNERSHIP.map(({ value, label }) => (
              <Chip
                key={value}
                label={label}
                selected={filters.ownership === value}
                onPress={() => update({ ownership: value })}
              />
            ))}
          </Section>
        </ScrollView>
        <View style={styles.actions}>
          <Button
            label="Réinitialiser"
            onPress={() => onChange({ ...DEFAULT_CATALOG_FILTERS, search: filters.search })}
          />
          <Button
            label={`Voir ${formatPrintingCount(resultCount)}`}
            onPress={onClose}
            variant="primary"
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function Section({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: '#000a' },
  sheet: {
    maxHeight: '85%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  content: { padding: 16, gap: 16 },
  section: { gap: 8 },
  sectionTitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { color: colors.text, fontSize: 15 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
});
