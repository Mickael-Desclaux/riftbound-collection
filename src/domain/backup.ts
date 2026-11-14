/**
 * Sauvegarde (spec § 4.3) : les Données précieuses dans un fichier JSON
 * versionné, désignées par leur Code de version. Le Catalogue n'en fait pas
 * partie.
 *
 * Lecture : le document est entièrement validé avant d'être rendu, et un
 * document d'une version plus ancienne est d'abord converti, une version après
 * l'autre (`BACKUP_UPGRADES`). Les Sauvegardes de sécurité ont le même format.
 */
import { z } from 'zod';

import type { IsoDateTime } from './dates';
import { FINISHES, PRICE_SOURCES, type Finish, type PriceSource } from './price';
import { priceKey, type PriceRecord } from './priceRecords';
import type { PrintingCode } from './printingCode';
import { isValidSetting, SETTING_KEYS, type SettingValues } from './settings';

export const BACKUP_FORMAT = 'riftbound-collection-backup';
/** Version du format écrit par cette version de l'app. */
export const BACKUP_VERSION = 1;

/** L'historique d'un prix (Version × source × Finition) : ses Relevés, du plus ancien au plus récent. */
export type PriceSeries = {
  printingCode: PrintingCode;
  source: PriceSource;
  finish: Finish;
  points: [recordedAt: IsoDateTime, value: number][];
};

export type BackupWishlistEntry = {
  printingCode: PrintingCode;
  addedAt: IsoDateTime;
  lastAlertPrice: number | null;
  lastAlertSource: PriceSource | null;
  lastAlertAt: IsoDateTime | null;
};

/** Tout ce que contient une Sauvegarde, hors en-tête. */
export type PreciousData = {
  settings: SettingValues;
  collection: { printingCode: PrintingCode; quantity: number }[];
  wishlist: BackupWishlistEntry[];
  binderSelection: PrintingCode[];
  priceHistory: PriceSeries[];
};

export type Backup = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: IsoDateTime;
} & PreciousData;

export type BackupReadError = {
  /**
   * `not-a-backup` : un autre fichier ; `too-recent` : écrite par une version
   * plus récente de l'app ; `damaged` : une Sauvegarde, mais incomplète ou modifiée.
   */
  kind: 'not-a-backup' | 'too-recent' | 'damaged';
  /** Diagnostic, pour le repli « Détails ». */
  details: string;
};

export type BackupReadResult = { ok: true; backup: Backup } | { ok: false; error: BackupReadError };

/** Convertit un document de la version n vers la version n + 1. */
export type BackupUpgrade = (document: Record<string, unknown>) => Record<string, unknown>;

/** `BACKUP_UPGRADES[i]` convertit la version i + 1 en version i + 2. */
const BACKUP_UPGRADES: readonly BackupUpgrade[] = [];

export function createBackup(data: PreciousData, exportedAt: IsoDateTime): Backup {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt, ...data };
}

export function serializeBackup(backup: Backup): string {
  return JSON.stringify(backup);
}

/** Lit le texte d'un fichier de Sauvegarde, sans jamais lever d'erreur. */
export function readBackup(text: string): BackupReadResult {
  let document: unknown;
  try {
    document = JSON.parse(text);
  } catch (error) {
    return failure('not-a-backup', `JSON illisible : ${messageOf(error)}`);
  }

  const header = headerSchema.safeParse(document);
  if (!header.success) {
    return failure('not-a-backup', `En-tête inattendu : ${z.prettifyError(header.error)}`);
  }
  const { version } = header.data;
  if (version > BACKUP_VERSION) {
    return failure(
      'too-recent',
      `Format ${version}, cette version de l'app lit jusqu'au format ${BACKUP_VERSION}.`,
    );
  }

  let upgraded: Record<string, unknown>;
  try {
    upgraded = upgradeBackupDocument(header.data, BACKUP_VERSION, BACKUP_UPGRADES);
  } catch (error) {
    return failure('damaged', `Conversion du format ${version} impossible : ${messageOf(error)}`);
  }

  const backup = backupSchema.safeParse(upgraded);
  if (!backup.success) return failure('damaged', z.prettifyError(backup.error));
  return { ok: true, backup: backup.data as Backup };
}

/**
 * Convertit `document` de sa version jusqu'à `targetVersion`, une version
 * après l'autre ; `upgrades[i]` convertit la version i + 1 en version i + 2.
 */
export function upgradeBackupDocument<T extends { version: number }>(
  document: T,
  targetVersion: number,
  upgrades: readonly BackupUpgrade[],
): Record<string, unknown> {
  let current: Record<string, unknown> = document;
  for (let version = document.version; version < targetVersion; version++) {
    const upgrade = upgrades[version - 1];
    if (!upgrade) throw new Error(`aucune conversion depuis la version ${version}`);
    current = upgrade(current);
  }
  return current;
}

/** Regroupe les Relevés de prix en séries, dans l'ordre où chaque prix apparaît. */
export function toPriceSeries(records: readonly PriceRecord[]): PriceSeries[] {
  const byKey = new Map<string, PriceSeries>();
  for (const { printingCode, source, finish, recordedAt, value } of records) {
    const key = priceKey({ printingCode, source, finish });
    let series = byKey.get(key);
    if (!series) {
      series = { printingCode, source, finish, points: [] };
      byKey.set(key, series);
    }
    series.points.push([recordedAt, value]);
  }
  for (const series of byKey.values()) {
    series.points.sort(([a], [b]) => (a < b ? -1 : 1));
  }
  return [...byKey.values()];
}

export function fromPriceSeries(series: readonly PriceSeries[]): PriceRecord[] {
  return series.flatMap(({ printingCode, source, finish, points }) =>
    points.map(([recordedAt, value]) => ({ printingCode, source, finish, recordedAt, value })),
  );
}

function failure(kind: BackupReadError['kind'], details: string): BackupReadResult {
  return { ok: false, error: { kind, details } };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// ---------------------------------------------------------------------------
// Schémas
// ---------------------------------------------------------------------------

const headerSchema = z.looseObject({
  format: z.literal(BACKUP_FORMAT),
  version: z.number().int().positive(),
});

const printingCodeSchema = z.string().min(1);
const dateTimeSchema = z.iso.datetime();
const priceSchema = z.number().nonnegative();

/** Refuse un tableau où deux éléments ont la même clé. */
function unique<T>(keyOf: (item: T) => string, what: string) {
  return (items: T[], context: z.RefinementCtx) => {
    const seen = new Set<string>();
    items.forEach((item, index) => {
      const key = keyOf(item);
      if (seen.has(key)) {
        context.addIssue({ code: 'custom', message: `${what} en double : ${key}`, path: [index] });
      }
      seen.add(key);
    });
  };
}

const settingsSchema = z.strictObject(
  Object.fromEntries(
    SETTING_KEYS.map((key) => [
      key,
      z
        .unknown()
        .refine((value) => value !== undefined && isValidSetting(key, value), {
          message: `valeur non permise pour le réglage « ${key} »`,
        })
        .optional(),
    ]),
  ),
);

const priceSeriesSchema = z.strictObject({
  printingCode: printingCodeSchema,
  source: z.enum(PRICE_SOURCES),
  finish: z.enum(FINISHES),
  points: z
    .array(z.tuple([dateTimeSchema, priceSchema]))
    .min(1)
    .superRefine(unique(([recordedAt]) => recordedAt, 'Relevé de prix')),
});

const backupSchema = z.strictObject({
  format: z.literal(BACKUP_FORMAT),
  version: z.literal(BACKUP_VERSION),
  exportedAt: dateTimeSchema,
  settings: settingsSchema,
  collection: z
    .array(
      z.strictObject({ printingCode: printingCodeSchema, quantity: z.number().int().positive() }),
    )
    .superRefine(unique((entry) => entry.printingCode, 'Version')),
  wishlist: z
    .array(
      z
        .strictObject({
          printingCode: printingCodeSchema,
          addedAt: dateTimeSchema,
          lastAlertPrice: priceSchema.nullable(),
          lastAlertSource: z.enum(PRICE_SOURCES).nullable(),
          lastAlertAt: dateTimeSchema.nullable(),
        })
        .refine(
          // La dernière Alerte de prix est entière, ou absente.
          ({ lastAlertPrice, lastAlertSource, lastAlertAt }) =>
            new Set([lastAlertPrice, lastAlertSource, lastAlertAt].map((v) => v === null)).size ===
            1,
          { message: 'dernière Alerte de prix incomplète' },
        ),
    )
    .superRefine(unique((entry) => entry.printingCode, 'Version')),
  binderSelection: z
    .array(printingCodeSchema)
    .superRefine(unique((code: string) => code, 'Version')),
  priceHistory: z
    .array(priceSeriesSchema)
    .superRefine(
      unique(
        (series: z.infer<typeof priceSeriesSchema>) => priceKey(series as PriceSeries),
        'Historique de prix',
      ),
    ),
});
