import { createContext, useContext, type ReactNode } from 'react';

import type { AppDatabase } from './database';

const DatabaseContext = createContext<AppDatabase | null>(null);

export function DatabaseProvider({ db, children }: { db: AppDatabase; children: ReactNode }) {
  return <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>;
}

/** La base injectée par `DatabaseProvider`. */
export function useDatabase(): AppDatabase {
  const db = useContext(DatabaseContext);
  if (db === null) {
    throw new Error('useDatabase doit être appelé sous un DatabaseProvider.');
  }
  return db;
}
