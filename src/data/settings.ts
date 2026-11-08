/** Accès aux réglages, rangés dans la table `setting` (clé → valeur JSON). */
import { eq } from 'drizzle-orm';

import {
  isValidSetting,
  parseSetting,
  type SettingKey,
  type SettingValue,
} from '@/domain/settings';

import type { AppDatabase } from './database';
import { setting } from './schema';

/** Requête de la ligne d'un réglage ; sert aussi aux lectures réactives. */
export function selectSetting(db: AppDatabase, key: SettingKey) {
  return db.select({ value: setting.value }).from(setting).where(eq(setting.key, key));
}

export function getSetting<K extends SettingKey>(db: AppDatabase, key: K): SettingValue<K> {
  return parseSetting(key, selectSetting(db, key).get()?.value);
}

export function setSetting<K extends SettingKey>(
  db: AppDatabase,
  key: K,
  value: SettingValue<K>,
): void {
  if (!isValidSetting(key, value)) {
    throw new Error(`Valeur refusée pour le réglage « ${key} » : ${JSON.stringify(value)}`);
  }
  const stored = JSON.stringify(value);
  db.insert(setting)
    .values({ key, value: stored })
    .onConflictDoUpdate({ target: setting.key, set: { value: stored } })
    .run();
}
