import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { IsoDateTime } from '@/domain/dates';
import { arePricesStale } from '@/domain/priceDisplay';
import { colors } from '@/ui/theme';

const formatDay = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format;

type Props = {
  latestPublishedAt: IsoDateTime | undefined;
  now: Date;
  onRefresh: () => void;
};

/**
 * Bandeau global (spec § 3) : les prix de la Source choisie ont plus de 48 h.
 * Il porte sa propre marge du haut, et rien quand les prix sont à jour.
 */
export function StalePricesNotice({ latestPublishedAt, now, onRefresh }: Readonly<Props>) {
  if (!latestPublishedAt || !arePricesStale(latestPublishedAt, now)) return null;
  return (
    <SafeAreaView edges={['top']} style={styles.banner}>
      <View style={styles.row}>
        <Text style={styles.text}>
          Prix du {formatDay(new Date(latestPublishedAt))} : plus de 48 h.
        </Text>
        <Pressable accessibilityRole="button" onPress={onRefresh} hitSlop={8}>
          <Text style={styles.action}>Mettre à jour</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.accent },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  text: { flex: 1, color: colors.text, fontSize: 13 },
  action: { color: colors.accent, fontSize: 13, fontWeight: '700' },
});
