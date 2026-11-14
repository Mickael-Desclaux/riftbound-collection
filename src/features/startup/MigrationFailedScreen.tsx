/**
 * La base n'a pas pu être mise à jour au démarrage (spec § 4.4) : rien n'a été
 * modifié, et la Sauvegarde de sécurité peut être exportée pour la garder à l'abri.
 */
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import type { MigrationStep } from '@/data/migrate';
import { Button } from '@/ui/controls';
import { Details } from '@/ui/Details';
import { MessageScreen, MessageText } from '@/ui/MessageScreen';
import { colors } from '@/ui/theme';

export type MigrationFailedScreenProps = {
  step: MigrationStep;
  details: string;
  /** Une Sauvegarde de sécurité de migration est-elle là ? */
  hasSafetyBackup: boolean;
  /** Ouvre la fenêtre de partage avec la Sauvegarde de sécurité. */
  exportSafetyBackup: () => Promise<void>;
  retry: () => void;
};

const MESSAGES: Record<MigrationStep, string> = {
  'safety-backup':
    'La sauvegarde de sécurité n’a pas pu être créée, la mise à jour n’a donc pas été faite. Tes données n’ont pas été modifiées. Libère de la place sur le téléphone, puis réessaie.',
  migration:
    'Tes données n’ont pas été modifiées. Exporte la sauvegarde de sécurité pour la garder à l’abri, puis réessaie ou installe une nouvelle version de l’app.',
};

export function MigrationFailedScreen({
  step,
  details,
  hasSafetyBackup,
  exportSafetyBackup,
  retry,
}: Readonly<MigrationFailedScreenProps>) {
  const [exportFailed, setExportFailed] = useState(false);
  const exportBackup = () => {
    setExportFailed(false);
    exportSafetyBackup().catch(() => setExportFailed(true));
  };
  return (
    <MessageScreen title="La base de données n’a pas pu être mise à jour">
      <MessageText>{MESSAGES[step]}</MessageText>
      {hasSafetyBackup && (
        <Button
          label="Exporter la sauvegarde de sécurité"
          onPress={exportBackup}
          variant="primary"
        />
      )}
      {exportFailed && (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          La sauvegarde de sécurité n’a pas pu être exportée. Réessaie.
        </Text>
      )}
      <Button label="Réessayer" onPress={retry} />
      <Details text={details} />
    </MessageScreen>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.accent, fontSize: 14, textAlign: 'center' },
});
