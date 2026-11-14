/**
 * Règles des réglages : valeurs permises et valeurs par défaut.
 *
 * Une valeur absente, illisible ou qui n'est plus permise (option retirée d'une
 * version à l'autre) est remplacée par la valeur par défaut, sans jamais faire
 * échouer la lecture.
 */
import { isIsoDate, type IsoDate } from './dates';
import { CURRENCIES, PRICE_SOURCES } from './price';

export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export const CHART_PRESET_PERIODS = ['7d', '30d', '90d', '1y', 'all'] as const;
export type ChartPresetPeriod = (typeof CHART_PRESET_PERIODS)[number];

/** Période du graphique d'évolution : une période prédéfinie, ou « Dates… ». */
/** « Dates… » : une plage choisie dans le calendrier. */
export type CustomChartPeriod = { from: IsoDate; to: IsoDate };
export type ChartPeriod = ChartPresetPeriod | CustomChartPeriod;

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

function toggle(defaultValue: boolean): SettingDefinition<boolean> {
  return { defaultValue, isValid: (value): value is boolean => typeof value === 'boolean' };
}

function percentage(defaultValue: number): SettingDefinition<number> {
  return {
    defaultValue,
    isValid: (value): value is number =>
      typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 100,
  };
}

const chartPreset = oneOf(CHART_PRESET_PERIODS, '30d');

function isChartPeriod(value: unknown): value is ChartPeriod {
  if (chartPreset.isValid(value)) return true;
  if (typeof value !== 'object' || value === null) return false;
  const { from, to } = value as Record<string, unknown>;
  return isIsoDate(from) && isIsoDate(to) && from <= to;
}

const chartPeriod: SettingDefinition<ChartPeriod> = {
  defaultValue: chartPreset.defaultValue,
  isValid: isChartPeriod,
};

const SETTINGS = {
  displayCurrency: oneOf(CURRENCIES, 'CAD'),
  priceSource: oneOf(PRICE_SOURCES, 'tcgplayer'),
  theme: oneOf(THEMES, 'system'),
  chartPeriod,
  newExpansionNotifications: toggle(true),
  priceAlertNotifications: toggle(true),
  /** Seuil de baisse, en %, qui déclenche une Alerte de prix. */
  priceAlertThreshold: percentage(15),
} satisfies Record<string, SettingDefinition<unknown>>;

export type SettingKey = keyof typeof SETTINGS;
export type SettingValue<K extends SettingKey> = (typeof SETTINGS)[K]['defaultValue'];

function definitionOf<K extends SettingKey>(key: K): SettingDefinition<SettingValue<K>> {
  return SETTINGS[key];
}

export function isValidSetting<K extends SettingKey>(
  key: K,
  value: unknown,
): value is SettingValue<K> {
  return definitionOf(key).isValid(value);
}

/** Interprète la valeur JSON stockée d'un réglage (`undefined` si elle n'existe pas). */
export function parseSetting<K extends SettingKey>(
  key: K,
  stored: string | undefined,
): SettingValue<K> {
  const { defaultValue } = definitionOf(key);
  if (stored === undefined) return defaultValue;
  try {
    const value: unknown = JSON.parse(stored);
    return isValidSetting(key, value) ? value : defaultValue;
  } catch {
    return defaultValue;
  }
}
