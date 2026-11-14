import { useMemo } from 'react';

import { readPreciousData, restoreBackup, undoLastRestore } from '@/data/backup';
import { useDatabase } from '@/data/DatabaseProvider';
import { createBackup, readBackup, serializeBackup } from '@/domain/backup';
import { localIsoDate } from '@/domain/dates';
import { useClock } from '@/ui/ClockContext';

import type { BackupActions } from './BackupSettings';
import { fileSystemSafetyBackups, pickBackupFile, shareBackupFile } from './backupFiles';

/** Les actions de la section « Données », branchées sur la base et les fichiers du téléphone. */
export function useBackupActions(): BackupActions {
  const db = useDatabase();
  const now = useClock();
  return useMemo(
    () => ({
      exportBackup: () => {
        const at = now();
        const backup = createBackup(readPreciousData(db), at.toISOString());
        return shareBackupFile(
          serializeBackup(backup),
          `riftbound-collection-${localIsoDate(at)}.json`,
        );
      },
      pickBackup: async () => {
        const text = await pickBackupFile();
        return text === null ? null : readBackup(text);
      },
      restore: (backup) =>
        restoreBackup(db, backup, { safetyBackups: fileSystemSafetyBackups, now }),
      undoLastRestore: () => undoLastRestore(db, fileSystemSafetyBackups),
      canUndoLastRestore: () => fileSystemSafetyBackups.has('restore'),
    }),
    [db, now],
  );
}
