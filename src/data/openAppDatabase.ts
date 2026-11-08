import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

const DATABASE_NAME = 'riftbound.db';

/** Ouvre la base de l'app. À n'appeler qu'une fois, à la racine. */
export function openAppDatabase(): ExpoSQLiteDatabase<typeof schema> {
  // `enableChangeListener` : indispensable aux requêtes réactives (`useLiveQuery`).
  const sqlite = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
  sqlite.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  return drizzle(sqlite, { schema });
}
