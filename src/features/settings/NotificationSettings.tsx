import { StyleSheet, Switch, Text, View } from 'react-native';

import { colors } from '@/ui/theme';

type Props = {
  newExpansions: boolean;
  onNewExpansionsChange: (enabled: boolean) => void;
};

/** Réglages des notifications (spec § 2.6). */
export function NotificationSettings({ newExpansions, onNewExpansionsChange }: Readonly<Props>) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Nouvelles extensions</Text>
        <Switch
          accessibilityLabel="Nouvelles extensions"
          value={newExpansions}
          onValueChange={onNewExpansionsChange}
          trackColor={{ true: colors.accent, false: colors.line }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  title: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: colors.text, fontSize: 14 },
});
