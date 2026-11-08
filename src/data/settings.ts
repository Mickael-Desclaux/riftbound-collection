/**
 * Réglages de l'app, rangés dans la table `setting` (clé → valeur JSON).
 *
 * Chaque réglage a une valeur par défaut. Une valeur absente, illisible ou qui
 * n'est plus permise (option retirée d'une version à l'autre) est remplacée
 * par la valeur par défaut, sans jamais faire échouer la lecture.
 */
import { eq } from 'drizzle-orm';

import { CURRENCIES, PRICE_SOURCES } from '@/domain/price';

import type { AppDatabase } from './database';
import { setting } from './schema';

export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

/** Périodes du graphique d'évolution que l'app retient d'une fiche à l'autre. */
export const CHART_PERIODS = ['7d', '30d', '90d', '1y', 'all'] as const;
export type ChartPeriod = (typeof CHART_PERIODS)[number];

type SettingDefinition<T> = {
  defaultValue: T;
  isValid: (value: unknown) => value is T;
};

function oneOf<const T extends readonly string[]>(
  values: T,
  defaultValue: T[number],
): SettingDefinition<T[number]> {
  return {
    defaultValue,
    isValid: (value): value is T[number] => typeof value === 'string' && values.includes(value),
  };
}

function percentage(defaultValue: number): SettingDefinition<number> {
  return {
    defaultValue,
    isValid: (value): value is number =>
      typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 100,
  };
}

const SETTINGS = {
  displayCurrency: oneOf(CURRENCIES, 'CAD'),
  priceSource: oneOf(PRICE_SOURCES, 'tcgplayer'),
  theme: oneOf(THEMES, 'system'),
  chartPeriod: oneOf(CHART_PERIODS, '30d'),
  /** Seuil de baisse, en %, qui déclenche une Alerte de prix. */
  priceAlertThreshold: percentage(15),
} satisfies Record<string, SettingDefinition<unknown>>;

export type SettingKey = keyof typeof SETTINGS;
export type SettingValue<K extends SettingKey> = (typeof SETTINGS)[K]['defaultValue'];

/** Interprète la valeur stockée d'un réglage (`undefined` si la ligne n'existe pas). */
export function parseSetting<K extends SettingKey>(
  key: K,
  stored: string | undefined,
): SettingValue<K> {
  const definition: SettingDefinition<SettingValue<K>> = SETTINGS[key];
  if (stored === undefined) return definition.defaultValue;
  try {
    const value: unknown = JSON.parse(stored);
    return definition.isValid(value) ? value : definition.defaultValue;
  } catch {
    return definition.defaultValue;
  }
}

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
  const definition: SettingDefinition<SettingValue<K>> = SETTINGS[key];
  if (!definition.isValid(value)) {
    throw new Error(`Valeur refusée pour le réglage « ${key} » : ${JSON.stringify(value)}`);
  }
  const stored = JSON.stringify(value);
  db.insert(setting)
    .values({ key, value: stored })
    .onConflictDoUpdate({ target: setting.key, set: { value: stored } })
    .run();
}
