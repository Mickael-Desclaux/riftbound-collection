import { StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/ui/controls';
import { colors } from '@/ui/theme';

type Props = {
  newExpansions: boolean;
  onNewExpansionsChange: (enabled: boolean) => void;
  /** Android bloque les notifications de l'app : seul le message dans l'app reste. */
  blockedByAndroid: boolean;
  onOpenAndroidSettings: () => void;
};

/** Réglages des notifications (spec § 2.6). */
export function NotificationSettings({
  newExpansions,
  onNewExpansionsChange,
  blockedByAndroid,
  onOpenAndroidSettings,
}: Readonly<Props>) {
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
      {blockedByAndroid && (
        <>
          <Text style={styles.hint}>
            Android bloque les notifications de l’app : les nouveautés ne s’affichent que lorsque
            l’app est ouverte.
          </Text>
          <Button label="Autoriser dans Android" onPress={onOpenAndroidSettings} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  title: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: colors.text, fontSize: 14 },
  hint: { color: colors.muted, fontSize: 13 },
});
