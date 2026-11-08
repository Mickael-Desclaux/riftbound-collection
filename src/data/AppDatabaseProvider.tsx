import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useState, type ReactNode } from 'react';

import { PlaceholderScreen } from '@/ui/PlaceholderScreen';

import { DatabaseProvider } from './DatabaseProvider';
import migrations from './migrations/migrations';
import { openAppDatabase } from './openAppDatabase';

/**
 * Ouvre la base de l'app, applique les migrations en attente, puis la fournit
 * à tous les écrans. Rien ne s'affiche tant que les migrations ne sont pas faites.
 */
export function AppDatabaseProvider({ children }: { children: ReactNode }) {
  const [db] = useState(openAppDatabase);
  const { success, error } = useMigrations(db, migrations);

  if (error) {
    // L'écran complet (export de la Sauvegarde de sécurité) arrive avec le ticket #40.
    return (
      <PlaceholderScreen
        title="La base de données n'a pas pu être mise à jour"
        description={`Tes données n'ont pas été modifiées. Détails : ${error.message}`}
      />
    );
  }
  if (!success) return null;
  return <DatabaseProvider db={db}>{children}</DatabaseProvider>;
}
