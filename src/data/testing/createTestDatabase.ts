import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import type { AppDatabase } from '@/data/database';
import migrations from '@/data/migrations/migrations';
import * as schema from '@/data/schema';

/** Base SQLite en mémoire pour les tests, avec les mêmes migrations que l'app. */
export async function createTestDatabase(): Promise<{
  db: AppDatabase;
  sqlite: Database.Database;
}> {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  await applyMigrations(db);
  return { db, sqlite };
}

/** Même migrateur et même paquet de migrations que `useMigrations` dans l'app. */
export async function applyMigrations(db: AppDatabase): Promise<void> {
  // Les deux pilotes ne diffèrent que par le type du résultat d'écriture, que
  // le migrateur n'utilise pas : le transtypage est sans risque.
  await migrate(db as unknown as Parameters<typeof migrate>[0], migrations);
}
