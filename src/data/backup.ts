/**
 * Sauvegarde des Données précieuses (spec § 4.3) : lecture pour l'export,
 * remplacement atomique pour la restauration, précédé d'une Sauvegarde de
 * sécurité qui permet « Annuler la dernière restauration ».
 */
import { getTableColumns, sql } from 'drizzle-orm';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';

import {
  createBackup,
  fromPriceSeries,
  readBackup,
  serializeBackup,
  toPriceSeries,
  type Backup,
  type PreciousData,
} from '@/domain/backup';
import {
  isValidSetting,
  SETTING_KEYS,
  type SettingKey,
  type SettingValues,
} from '@/domain/settings';

import { chunks } from './chunks';
import type { AppDatabase } from './database';
import {
  binderSelection,
  collectionEntry,
  preciousDataTables,
  priceRecord,
  setting,
  wishlistEntry,
} from './schema';

/** Les Sauvegardes de sécurité gardées : la dernière de chaque type. */
export type SafetyBackupKind = 'restore' | 'migration';

/** Où sont rangées les Sauvegardes de sécurité (le dossier privé de l'app). */
export type SafetyBackupStore = {
  /** Le texte de la Sauvegarde de sécurité, ou `null` s'il n'y en a pas. */
  read(kind: SafetyBackupKind): Promise<string | null>;
  has(kind: SafetyBackupKind): Promise<boolean>;
  /** Remplace la Sauvegarde de sécurité de ce type. */
  write(kind: SafetyBackupKind, text: string): Promise<void>;
  remove(kind: SafetyBackupKind): Promise<void>;
};

/**
 * Toutes les Données précieuses, telles qu'elles iront dans une Sauvegarde.
 *
 * Elles sont lues colonne par colonne d'après ce que contient la base, pas
 * d'après le schéma du code : juste avant une migration, une table précieuse
 * n'a pas encore les colonnes que la migration va lui ajouter (elles sont
 * alors lues `null`).
 */
export function readPreciousData(db: AppDatabase): PreciousData {
  return {
    settings: readSettings(db),
    collection: readRows(db, collectionEntry, [collectionEntry.printingCode]).map(
      ({ printingCode, quantity }) => ({ printingCode, quantity }),
    ),
    wishlist: readRows(db, wishlistEntry, [wishlistEntry.printingCode]),
    binderSelection: readRows(db, binderSelection, [binderSelection.printingCode]).map(
      (row) => row.printingCode,
    ),
    priceHistory: toPriceSeries(
      readRows(db, priceRecord, [priceRecord.printingCode, priceRecord.source, priceRecord.finish]),
    ),
  };
}

/** Les lignes d'une table, avec les seules colonnes présentes dans la base (les autres à `null`). */
function readRows<T extends SQLiteTable>(
  db: AppDatabase,
  table: T,
  orderBy: SQLiteColumn[],
): T['$inferSelect'][] {
  const columns = Object.entries(getTableColumns(table));
  const rows = db.all<Record<string, unknown>>(
    sql`SELECT * FROM ${table} ORDER BY ${sql.join(orderBy, sql`, `)}`,
  );
  return rows.map(
    (row) =>
      Object.fromEntries(
        columns.map(([key, column]) => [
          key,
          column.name in row ? column.mapFromDriverValue(row[column.name]) : null,
        ]),
      ) as T['$inferSelect'],
  );
}

/** Les réglages enregistrés ; un réglage illisible est laissé de côté, comme à la lecture. */
function readSettings(db: AppDatabase): SettingValues {
  const known = new Set<string>(SETTING_KEYS);
  const values: Record<string, unknown> = {};
  for (const { key, value } of readRows(db, setting, [setting.key])) {
    if (!known.has(key)) continue;
    try {
      const parsed: unknown = JSON.parse(value);
      if (isValidSetting(key as SettingKey, parsed)) values[key] = parsed;
    } catch {
      // Valeur illisible : la valeur par défaut s'applique déjà partout.
    }
  }
  return values as SettingValues;
}

/** Remplace toutes les Données précieuses par celles de la Sauvegarde, en une transaction. */
export function replacePreciousData(db: AppDatabase, data: PreciousData): void {
  db.transaction((tx) => {
    for (const table of Object.values(preciousDataTables)) tx.delete(table).run();

    const settingRows = Object.entries(data.settings).map(([key, value]) => ({
      key,
      value: JSON.stringify(value),
    }));
    const tables = [
      [setting, settingRows],
      [collectionEntry, data.collection],
      [wishlistEntry, data.wishlist],
      [binderSelection, data.binderSelection.map((printingCode) => ({ printingCode }))],
      [priceRecord, fromPriceSeries(data.priceHistory)],
    ] as const;
    for (const [table, rows] of tables) {
      for (const values of chunks<(typeof rows)[number]>([...rows])) {
        tx.insert(table).values(values).run();
      }
    }
  });
}

type RestoreDependencies = { safetyBackups: SafetyBackupStore; now: () => Date };

/**
 * Restaure une Sauvegarde déjà validée (`readBackup`) : les Données précieuses
 * actuelles partent d'abord dans la Sauvegarde de sécurité de restauration,
 * puis sont remplacées d'un bloc. Si l'écriture de la Sauvegarde de sécurité
 * échoue, rien n'est modifié ; si le remplacement échoue, la Sauvegarde de
 * sécurité précédente est remise.
 */
export async function restoreBackup(
  db: AppDatabase,
  backup: Backup,
  { safetyBackups, now }: RestoreDependencies,
): Promise<void> {
  const previous = await safetyBackups.read('restore');
  const current = createBackup(readPreciousData(db), now().toISOString());
  await safetyBackups.write('restore', serializeBackup(current));
  try {
    replacePreciousData(db, backup);
  } catch (error) {
    // Rien n'a été restauré : la restauration précédente reste celle qu'on peut annuler.
    await (previous === null
      ? safetyBackups.remove('restore')
      : safetyBackups.write('restore', previous));
    throw error;
  }
}

/**
 * « Annuler la dernière restauration » : remet les Données précieuses telles
 * qu'elles étaient juste avant, puis oublie la Sauvegarde de sécurité utilisée.
 */
export async function undoLastRestore(
  db: AppDatabase,
  safetyBackups: SafetyBackupStore,
): Promise<void> {
  const text = await safetyBackups.read('restore');
  if (text === null) throw new Error('Aucune restauration à annuler.');
  const result = readBackup(text);
  if (!result.ok) {
    throw new Error(`Sauvegarde de sécurité illisible (${result.error.details}).`);
  }
  replacePreciousData(db, result.backup);
  await safetyBackups.remove('restore');
}
