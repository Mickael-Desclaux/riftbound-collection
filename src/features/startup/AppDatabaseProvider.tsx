import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { DatabaseProvider } from '@/data/DatabaseProvider';
import { MigrationError, migrateSafely, type MigrationStep } from '@/data/migrate';
import migrations from '@/data/migrations/migrations';
import { localIsoDate } from '@/domain/dates';
import { fileSystemSafetyBackups, shareBackupFile } from '@/features/backup/backupFiles';

import { appDatabase, syncsIdle } from './appSync';
import { MigrationFailedScreen } from './MigrationFailedScreen';

type State =
  | { step: 'migrating' }
  | { step: 'ready' }
  | { step: 'failed'; failedStep: MigrationStep; details: string; hasSafetyBackup: boolean };

/**
 * Ouvre la base de l'app, applique les migrations en attente (précédées d'une
 * Sauvegarde de sécurité si elles touchent aux Données précieuses), puis la
 * fournit à tous les écrans. Rien ne s'affiche tant que les migrations ne sont
 * pas faites ; en cas d'échec, l'écran propose d'exporter la Sauvegarde de sécurité.
 */
export function AppDatabaseProvider({ children }: { children: ReactNode }) {
  const [db] = useState(appDatabase);
  const [state, setState] = useState<State>({ step: 'migrating' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    const now = () => new Date();
    syncsIdle()
      .then(() => migrateSafely(db, migrations, { safetyBackups: fileSystemSafetyBackups, now }))
      .then(() => {
        if (current) setState({ step: 'ready' });
      })
      .catch((error: unknown) => {
        if (!current) return;
        const failure = error instanceof MigrationError ? error : undefined;
        setState({
          step: 'failed',
          failedStep: failure?.step ?? 'migration',
          details: String(failure?.cause ?? error),
          // Seulement celle de cette tentative : une plus ancienne ne protège pas les données actuelles.
          hasSafetyBackup: failure?.safetyBackupWritten ?? false,
        });
      });
    return () => {
      current = false;
    };
  }, [db, attempt]);

  const exportSafetyBackup = useCallback(async () => {
    const text = await fileSystemSafetyBackups.read('migration');
    if (text === null) throw new Error('Aucune sauvegarde de sécurité.');
    await shareBackupFile(text, `riftbound-collection-securite-${localIsoDate(new Date())}.json`);
  }, []);

  switch (state.step) {
    case 'migrating':
      return null;
    case 'failed':
      return (
        <MigrationFailedScreen
          step={state.failedStep}
          details={state.details}
          hasSafetyBackup={state.hasSafetyBackup}
          exportSafetyBackup={exportSafetyBackup}
          retry={() => {
            setState({ step: 'migrating' });
            setAttempt((n) => n + 1);
          }}
        />
      );
    case 'ready':
      return <DatabaseProvider db={db}>{children}</DatabaseProvider>;
  }
}
