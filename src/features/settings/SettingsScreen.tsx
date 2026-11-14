import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSetting } from '@/data/useSetting';
import { BackupSettings } from '@/features/backup/BackupSettings';
import { useBackupActions } from '@/features/backup/useBackupActions';
import { colors } from '@/ui/theme';

import { PriceSettings } from './PriceSettings';

/** Onglet Réglages : les réglages des prix et les Sauvegardes. */
export function SettingsScreen() {
  const [displayCurrency, setDisplayCurrency] = useSetting('displayCurrency');
  const [priceSource, setPriceSource] = useSetting('priceSource');
  const backupActions = useBackupActions();
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
        <BackupSettings actions={backupActions} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 8 },
  heading: { color: colors.text, fontSize: 22, fontWeight: '700' },
});
