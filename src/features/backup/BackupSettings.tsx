/**
 * Section « Données » des Réglages (spec § 2.6, § 4.3) : exporter une
 * Sauvegarde, en restaurer une, annuler la dernière restauration.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import type { Backup, BackupReadError, BackupReadResult } from '@/domain/backup';
import { Button } from '@/ui/controls';
import { Details } from '@/ui/Details';
import { formatDate, formatPrintingCount, formatWishCount } from '@/ui/format';
import { colors } from '@/ui/theme';

export type BackupActions = {
  /** Écrit la Sauvegarde et ouvre la fenêtre de partage. */
  exportBackup(): Promise<void>;
  /** Fait choisir un fichier et le lit ; `null` si l'utilisateur renonce. */
  pickBackup(): Promise<BackupReadResult | null>;
  restore(backup: Backup): Promise<void>;
  undoLastRestore(): Promise<void>;
  canUndoLastRestore(): Promise<boolean>;
};

export const BACKUP_READ_ERRORS: Record<BackupReadError['kind'], string> = {
  'not-a-backup': 'Ce fichier n’est pas une sauvegarde Riftbound Collection. Choisis-en un autre.',
  damaged: 'Cette sauvegarde est abîmée : rien n’a été modifié. Essaie une autre sauvegarde.',
  'too-recent':
    'Cette sauvegarde vient d’une version plus récente de l’app : mets l’app à jour pour la restaurer.',
};

type Status = { tone: 'success' | 'error'; message: string; details?: string };

export function BackupSettings({ actions }: Readonly<{ actions: BackupActions }>) {
  const [status, setStatus] = useState<Status | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const busy = useRef(false);

  const refreshUndo = useCallback(
    () => actions.canUndoLastRestore().then(setCanUndo, () => setCanUndo(false)),
    [actions],
  );
  useEffect(() => {
    void refreshUndo();
  }, [refreshUndo]);

  /** Une action à la fois ; `task` rend le message à afficher, ou rien. */
  async function run(task: () => Promise<Status | undefined>, failure: string) {
    if (busy.current) return;
    busy.current = true;
    setStatus(null);
    try {
      const next = await task();
      if (next) setStatus(next);
    } catch (error) {
      setStatus({ tone: 'error', message: failure, details: String(error) });
    } finally {
      busy.current = false;
      await refreshUndo();
    }
  }

  const exportBackup = () =>
    run(async () => {
      await actions.exportBackup();
      return undefined;
    }, 'La sauvegarde n’a pas pu être exportée. Réessaie.');

  const restore = () =>
    run(async () => {
      const result = await actions.pickBackup();
      if (result === null) return undefined;
      if (!result.ok) {
        const { kind, details } = result.error;
        return { tone: 'error', message: BACKUP_READ_ERRORS[kind], details };
      }
      const confirmed = await confirm(
        'Restaurer cette sauvegarde ?',
        `${summaryOf(result.backup)}\n\nElle remplacera ta Collection, tes souhaits, ton classeur, tes réglages et l’historique des prix. Tes données actuelles seront gardées de côté : tu pourras annuler.`,
        'Restaurer',
      );
      if (!confirmed) return undefined;
      await actions.restore(result.backup);
      return {
        tone: 'success',
        message:
          'Sauvegarde restaurée. « Annuler la dernière restauration » remet tes données d’avant.',
      };
    }, 'La sauvegarde n’a pas pu être restaurée : rien n’a été modifié. Réessaie.');

  const undo = () =>
    run(async () => {
      const confirmed = await confirm(
        'Annuler la dernière restauration ?',
        'Tes données redeviendront celles d’avant la restauration.',
        'Annuler la restauration',
      );
      if (!confirmed) return undefined;
      await actions.undoLastRestore();
      return {
        tone: 'success',
        message: 'Restauration annulée : tes données d’avant sont revenues.',
      };
    }, 'La restauration n’a pas pu être annulée : rien n’a été modifié. Réessaie.');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Données</Text>
      <Button label="Exporter une sauvegarde" onPress={exportBackup} />
      <Button label="Restaurer une sauvegarde" onPress={restore} />
      {canUndo && <Button label="Annuler la dernière restauration" onPress={undo} />}
      {status && (
        <View accessibilityLiveRegion="polite" style={styles.status}>
          <Text style={status.tone === 'error' ? styles.error : styles.success}>
            {status.message}
          </Text>
          <Details text={status.details} align="flex-start" />
        </View>
      )}
    </View>
  );
}

/** « Sauvegarde du 14 novembre 2026 : 12 versions dans la Collection, 3 souhaits. » */
function summaryOf(backup: Backup): string {
  return `Sauvegarde du ${formatDate(backup.exportedAt)} : ${formatPrintingCount(backup.collection.length)} dans la Collection, ${formatWishCount(backup.wishlist.length)}.`;
}

function confirm(title: string, message: string, confirmLabel: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Retour', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

const styles = StyleSheet.create({
  container: { gap: 10, marginTop: 16 },
  title: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 8 },
  status: { gap: 6 },
  success: { color: colors.text, fontSize: 14 },
  error: { color: colors.accent, fontSize: 14 },
});
