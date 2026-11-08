import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useCallback, useState } from 'react';

import { parseSetting, type SettingKey, type SettingValue } from '@/domain/settings';

import { useDatabase } from './DatabaseProvider';
import { getSetting, selectSetting, setSetting } from './settings';

/**
 * Lit un réglage et le tient à jour quand il change, depuis n'importe quel écran.
 * La première valeur est lue tout de suite, sans attendre la requête réactive.
 */
export function useSetting<K extends SettingKey>(
  key: K,
): [SettingValue<K>, (value: SettingValue<K>) => void] {
  const db = useDatabase();
  const [initialValue] = useState(() => getSetting(db, key));
  const { data, updatedAt } = useLiveQuery(selectSetting(db, key), [key]);

  const value = updatedAt === undefined ? initialValue : parseSetting(key, data[0]?.value);
  const setValue = useCallback((next: SettingValue<K>) => setSetting(db, key, next), [db, key]);
  return [value, setValue];
}
