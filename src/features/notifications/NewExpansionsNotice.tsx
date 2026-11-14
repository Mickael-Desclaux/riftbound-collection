import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { NewExpansion } from '@/sync/syncAll';
import { colors } from '@/ui/theme';

import { newExpansionsText } from './newExpansionsText';

type Props = {
  expansions: readonly NewExpansion[];
  onOpen: () => void;
  onDismiss: () => void;
};

/**
 * Message « Nouvelle extension » (spec § 5), en haut de l'écran jusqu'à ce
 * qu'on l'ouvre ou le ferme. Il porte sa propre marge du haut, et rien sans
 * nouvelle Extension.
 */
export function NewExpansionsNotice({ expansions, onOpen, onDismiss }: Readonly<Props>) {
  if (expansions.length === 0) return null;
  return (
    <SafeAreaView edges={['top']} style={styles.banner}>
      <View style={styles.row}>
        <Text style={styles.text}>{newExpansionsText(expansions)}</Text>
        <Pressable accessibilityRole="button" onPress={onOpen} hitSlop={8}>
          <Text style={styles.action}>Voir</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer"
          onPress={onDismiss}
          hitSlop={8}
        >
          <Text style={styles.close}>✕</Text>
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
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  text: { flex: 1, color: colors.text, fontSize: 13 },
  action: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  close: { color: colors.muted, fontSize: 13 },
});
