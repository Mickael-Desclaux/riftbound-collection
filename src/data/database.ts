import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type * as schema from './schema';

/**
 * Base de l'app, quel que soit le pilote : expo-sqlite dans l'app,
 * better-sqlite3 dans les tests. Le code métier la reçoit toujours en paramètre.
 */
export type AppDatabase = BaseSQLiteDatabase<'sync', unknown, typeof schema>;
