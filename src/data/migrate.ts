/**
 * Migrations au démarrage (spec § 4.4). Une migration qui touche aux Données
 * précieuses est précédée d'une Sauvegarde de sécurité ; le migrateur de
 * Drizzle les applique toutes en une transaction : en cas d'échec, rien n'est
 * modifié.
 */
import { getTableName, sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { createBackup, serializeBackup } from '@/domain/backup';

import { readPreciousData, type SafetyBackupStore } from './backup';
import type { AppDatabase } from './database';
import { preciousDataTables } from './schema';

/** Le paquet de migrations généré par `pnpm db:generate` (`migrations/migrations.js`). */
export type Migrations = Parameters<typeof migrate>[1];

/**
 * - `safety-backup` : la Sauvegarde de sécurité n'a pas pu être écrite, rien n'a été migré ;
 * - `migration` : une migration a échoué, la base est restée telle quelle.
 */
export type MigrationStep = 'safety-backup' | 'migration';

export class MigrationError extends Error {
  constructor(
    readonly step: MigrationStep,
    readonly cause: unknown,
    /** Une Sauvegarde de sécurité a été écrite juste avant cet échec : on peut l'exporter. */
    readonly safetyBackupWritten = false,
  ) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = 'MigrationError';
  }
}

type Dependencies = { safetyBackups: SafetyBackupStore; now: () => Date };

/**
 * Applique les migrations en attente.
 *
 * La Sauvegarde de sécurité est lue d'après les colonnes présentes dans la base
 * (`readPreciousData`) : une colonne précieuse ajoutée par la migration est
 * lue `null`. Une migration qui renomme ou retire une colonne précieuse doit
 * garder cette lecture possible sur l'ancien schéma.
 */
export async function migrateSafely(
  db: AppDatabase,
  migrations: Migrations,
  { safetyBackups, now }: Dependencies,
): Promise<void> {
  const needsSafetyBackup = pendingMigrations(db, migrations).some(touchesPreciousData);
  if (needsSafetyBackup) {
    try {
      const backup = createBackup(readPreciousData(db), now().toISOString());
      await safetyBackups.write('migration', serializeBackup(backup));
    } catch (error) {
      throw new MigrationError('safety-backup', error);
    }
  }
  try {
    // Les deux pilotes (expo-sqlite, better-sqlite3) ne diffèrent que par le
    // type du résultat d'écriture, que le migrateur n'utilise pas.
    await migrate(db as unknown as Parameters<typeof migrate>[0], migrations);
  } catch (error) {
    throw new MigrationError('migration', error, needsSafetyBackup);
  }
}

const MIGRATIONS_TABLE = '__drizzle_migrations';

/**
 * La base a-t-elle reçu toutes les migrations ? Faux pour une base neuve.
 * La tâche en arrière-plan ne synchronise qu'à cette condition : les
 * migrations, et leur écran d'échec, restent l'affaire de l'app ouverte.
 */
export function isUpToDate(db: AppDatabase, migrations: Migrations): boolean {
  const appliedUntil = lastAppliedAt(db);
  return (
    appliedUntil !== null && migrations.journal.entries.every((entry) => entry.when <= appliedUntil)
  );
}

/** Date de la dernière migration appliquée ; `null` si aucune ne l'a été. */
function lastAppliedAt(db: AppDatabase): number | null {
  const table = db.get<{ name: string } | undefined>(
    sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ${MIGRATIONS_TABLE}`,
  );
  if (!table) return null;
  const last = db.get<{ createdAt: number | null }>(
    sql`SELECT max(created_at) AS createdAt FROM ${sql.identifier(MIGRATIONS_TABLE)}`,
  );
  return last?.createdAt == null ? null : Number(last.createdAt);
}

/**
 * Le SQL des migrations pas encore appliquées, selon la même règle que le
 * migrateur de Drizzle (plus récentes que la dernière appliquée). Une base
 * neuve n'en a aucune à protéger : elle n'a pas encore de Données précieuses.
 */
function pendingMigrations(db: AppDatabase, { journal, migrations }: Migrations): string[] {
  const appliedUntil = lastAppliedAt(db);
  if (appliedUntil === null) return [];
  return journal.entries
    .filter((entry) => entry.when > appliedUntil)
    .map((entry) => migrations[`m${String(entry.idx).padStart(4, '0')}`] ?? '');
}

const PRECIOUS_TABLE_NAMES = Object.values(preciousDataTables).map((table) => getTableName(table));

/** Le SQL cite-t-il une table précieuse (comme nom entier, pas dans `__new_…`) ? */
function touchesPreciousData(migrationSql: string): boolean {
  return PRECIOUS_TABLE_NAMES.some((name) =>
    new RegExp(String.raw`(?<!\w)${name}(?!\w)`).test(migrationSql),
  );
}
