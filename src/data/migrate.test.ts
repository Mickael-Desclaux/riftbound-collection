import Database from 'better-sqlite3';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import { readBackup } from '@/domain/backup';
import type { PrintingCode } from '@/domain/printingCode';

import { setOwnedQuantity } from './collection';
import type { AppDatabase } from './database';
import { MigrationError, migrateSafely, type Migrations } from './migrate';
import migrations from './migrations/migrations';
import * as schema from './schema';
import { collectionEntry } from './schema';
import { memorySafetyBackups } from './testing/memorySafetyBackups';
import { setWishlisted } from './wishlist';

const JINX = 'OGN-030a' as PrintingCode;
const now = () => new Date('2026-11-14T10:00:00.000Z');

/** Les migrations de l'app, suivies d'une nouvelle migration `sql`. */
function withNewMigration(sql: string): Migrations {
  const last = migrations.journal.entries.at(-1);
  if (!last) throw new Error('Aucune migration.');
  const idx = last.idx + 1;
  return {
    journal: {
      entries: [
        ...migrations.journal.entries,
        { idx, when: last.when + 1000, tag: `${idx}_test`, breakpoints: true },
      ],
    },
    migrations: { ...migrations.migrations, [`m${String(idx).padStart(4, '0')}`]: sql },
  };
}

function emptyDatabase(): AppDatabase {
  return drizzle(new Database(':memory:'), { schema });
}

/** Une base à jour avec une Version possédée, prête pour une nouvelle migration. */
async function installedDatabase(): Promise<AppDatabase> {
  const db = emptyDatabase();
  await migrateSafely(db, migrations, { safetyBackups: memorySafetyBackups().store, now });
  setOwnedQuantity(db, JINX, 3);
  return db;
}

describe('migrateSafely', () => {
  it('installe une base neuve sans Sauvegarde de sécurité : il n’y a rien à protéger', async () => {
    const { store, files } = memorySafetyBackups();

    await migrateSafely(emptyDatabase(), migrations, { safetyBackups: store, now });

    expect(files.size).toBe(0);
  });

  it('ne fait pas de Sauvegarde de sécurité pour une migration des seules Données de référence', async () => {
    const db = await installedDatabase();
    const { store, files } = memorySafetyBackups();

    await migrateSafely(db, withNewMigration('ALTER TABLE `printing` ADD `note` text;'), {
      safetyBackups: store,
      now,
    });

    expect(files.size).toBe(0);
  });

  it('fait une Sauvegarde de sécurité avant une migration des Données précieuses', async () => {
    const db = await installedDatabase();
    const { store, files } = memorySafetyBackups();

    await migrateSafely(db, withNewMigration('ALTER TABLE `collection_entry` ADD `note` text;'), {
      safetyBackups: store,
      now,
    });

    const result = readBackup(files.get('migration') ?? '');
    expect(result.ok && result.backup.collection).toEqual([{ printingCode: JINX, quantity: 3 }]);
  });

  it('lit la Sauvegarde de sécurité sur l’ancien schéma, sans les colonnes que la migration ajoute', async () => {
    const db = await installedDatabase();
    setWishlisted(db, JINX, '2026-11-02T09:00:00.000Z');
    // La base d'avant la migration : `last_alert_at` n'existe pas encore, alors
    // que le schéma du code la connaît déjà.
    db.run(sql.raw('ALTER TABLE `wishlist_entry` DROP COLUMN `last_alert_at`;'));
    const { store, files } = memorySafetyBackups();

    await migrateSafely(
      db,
      withNewMigration('ALTER TABLE `wishlist_entry` ADD `last_alert_at` text;'),
      { safetyBackups: store, now },
    );

    const result = readBackup(files.get('migration') ?? '');
    expect(result.ok && result.backup.wishlist).toEqual([
      expect.objectContaining({ printingCode: JINX, lastAlertAt: null }),
    ]);
  });

  it('ne modifie rien si la migration échoue', async () => {
    const db = await installedDatabase();
    const { store, files } = memorySafetyBackups();
    const failing = withNewMigration(
      'DELETE FROM `collection_entry`;\n--> statement-breakpoint\nALTER TABLE `missing` ADD `x` text;',
    );

    const error = await migrateSafely(db, failing, { safetyBackups: store, now }).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(MigrationError);
    expect((error as MigrationError).step).toBe('migration');
    expect((error as MigrationError).safetyBackupWritten).toBe(true);
    expect(db.select().from(collectionEntry).all()).toEqual([
      expect.objectContaining({ printingCode: JINX, quantity: 3 }),
    ]);
    expect(files.has('migration')).toBe(true);
  });

  it('ne migre pas si la Sauvegarde de sécurité n’a pas pu être écrite', async () => {
    const db = await installedDatabase();
    const { store } = memorySafetyBackups({ failWrites: true });

    const error = await migrateSafely(db, withNewMigration('DELETE FROM `collection_entry`;'), {
      safetyBackups: store,
      now,
    }).catch((e: unknown) => e);

    expect((error as MigrationError).step).toBe('safety-backup');
    expect(db.select().from(collectionEntry).all()).toHaveLength(1);
  });

  it('ne propose pas de Sauvegarde de sécurité quand la migration en échec ne touche qu’aux Données de référence', async () => {
    const db = await installedDatabase();

    const error = await migrateSafely(db, withNewMigration('ALTER TABLE `missing` ADD `x` text;'), {
      safetyBackups: memorySafetyBackups().store,
      now,
    }).catch((e: unknown) => e);

    expect((error as MigrationError).safetyBackupWritten).toBe(false);
  });
});
