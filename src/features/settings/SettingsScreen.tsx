import { Linking, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDatabase } from '@/data/DatabaseProvider';
import { readSourceStates } from '@/data/sourceState';
import { useReactiveQuery } from '@/data/useReactiveQuery';
import { useSetting } from '@/data/useSetting';
import { BackupSettings } from '@/features/backup/BackupSettings';
import { useBackupActions } from '@/features/backup/useBackupActions';
import { useNotificationPermission } from '@/features/notifications/useNotificationPermission';
import { useSync } from '@/ui/SyncContext';
import { colors } from '@/ui/theme';

import { NotificationSettings } from './NotificationSettings';
import { PriceSettings } from './PriceSettings';
import { SourceSettings } from './SourceSettings';

/** Onglet Réglages : les prix, les notifications, les Sauvegardes et l'état des sources. */
export function SettingsScreen() {
  const [displayCurrency, setDisplayCurrency] = useSetting('displayCurrency');
  const [priceSource, setPriceSource] = useSetting('priceSource');
  const [newExpansions, setNewExpansions] = useSetting('newExpansionNotifications');
  const notificationPermission = useNotificationPermission();
  const backupActions = useBackupActions();
  const db = useDatabase();
  const sourceStates = useReactiveQuery(() => readSourceStates(db), [db], ['source_state']);
  const { resynchronize } = useSync();
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Réglages</Text>
        <PriceSettings
          displayCurrency={displayCurrency}
          priceSource={priceSource}
          onDisplayCurrencyChange={setDisplayCurrency}
          onPriceSourceChange={setPriceSource}
        />
        <NotificationSettings
          newExpansions={newExpansions}
          onNewExpansionsChange={setNewExpansions}
          blockedByAndroid={notificationPermission === 'denied'}
          onOpenAndroidSettings={() => void Linking.openSettings()}
        />
        <BackupSettings actions={backupActions} />
        <SourceSettings states={sourceStates} resynchronize={resynchronize} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 8 },
  heading: { color: colors.text, fontSize: 22, fontWeight: '700' },
});
