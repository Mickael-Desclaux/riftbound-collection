import { card, collectionEntry, expansion, printing, setting } from './schema';
import { applyMigrations, createTestDatabase } from './testing/createTestDatabase';

const REFERENCE_TABLES = ['card', 'current_price', 'exchange_rate', 'expansion', 'printing'];
const PRECIOUS_TABLES = [
  'binder_entry',
  'collection_entry',
  'price_record',
  'setting',
  'wishlist_entry',
];

async function setup() {
  const { db, sqlite } = await createTestDatabase();
  const tableNames = (
    sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%'",
      )
      .all() as { name: string }[]
  )
    .map((row) => row.name)
    .sort();
  const foreignKeysOf = (table: string) =>
    sqlite.prepare(`PRAGMA foreign_key_list(${table})`).all();
  return { db, sqlite, tableNames, foreignKeysOf };
}

function insertOrigins(db: Awaited<ReturnType<typeof setup>>['db']) {
  db.insert(expansion)
    .values({
      code: 'OGN',
      name: 'Origins',
      releasedAt: '2025-10-31',
      isPromo: false,
      cardCount: 352,
    })
    .run();
  db.insert(card)
    .values({ oracleId: 'oracle-jinx', name: 'Jinx', type: 'Unit', domains: ['Fury', 'Chaos'] })
    .run();
}

describe('migrations', () => {
  it('créent les tables de référence et les tables précieuses', async () => {
    const { tableNames } = await setup();

    expect(tableNames).toEqual([...REFERENCE_TABLES, ...PRECIOUS_TABLES].sort());
  });

  it('peuvent être relancées sans rien changer', async () => {
    const { db } = await setup();
    db.insert(setting).values({ key: 'theme', value: '"dark"' }).run();

    await applyMigrations(db);

    expect(db.select().from(setting).all()).toEqual([{ key: 'theme', value: '"dark"' }]);
  });
});

describe('séparation des Données précieuses (ADR 0001)', () => {
  it.each(PRECIOUS_TABLES)("la table %s n'a aucune clé étrangère", async (table) => {
    const { foreignKeysOf } = await setup();

    expect(foreignKeysOf(table)).toEqual([]);
  });

  it('accepte une Version de la Collection absente du Catalogue', async () => {
    const { db } = await setup();

    db.insert(collectionEntry).values({ printingCode: 'OGN-999', quantity: 2 }).run();

    expect(db.select().from(collectionEntry).all()).toEqual([
      { printingCode: 'OGN-999', quantity: 2 },
    ]);
  });

  it('refuse une quantité nulle dans la Collection', async () => {
    const { db } = await setup();

    expect(() =>
      db.insert(collectionEntry).values({ printingCode: 'OGN-030a', quantity: 0 }).run(),
    ).toThrow(/CHECK constraint failed/);
  });
});

describe('Catalogue', () => {
  const jinx = {
    code: 'OGN-030a',
    cardOracleId: 'oracle-jinx',
    expansionCode: 'OGN',
    collectorNumber: '030a',
    rarity: 'Epic',
    variant: 'alternative',
    finishes: ['foil' as const],
    rifthuntPrintingId: 'rh-ogn-030a',
  };

  it('relit une Version avec ses colonnes JSON', async () => {
    const { db } = await setup();
    insertOrigins(db);

    db.insert(printing).values(jinx).run();

    expect(db.select().from(printing).get()).toMatchObject({
      code: 'OGN-030a',
      finishes: ['foil'],
    });
    expect(db.select().from(card).get()?.domains).toEqual(['Fury', 'Chaos']);
  });

  it("refuse une Version dont l'Extension est inconnue", async () => {
    const { db } = await setup();
    insertOrigins(db);

    expect(() =>
      db
        .insert(printing)
        .values({ ...jinx, expansionCode: 'XXX' })
        .run(),
    ).toThrow(/FOREIGN KEY constraint failed/);
  });

  it("supprime les Versions d'une Extension effacée, sans toucher à la Collection", async () => {
    const { db } = await setup();
    insertOrigins(db);
    db.insert(printing).values(jinx).run();
    db.insert(collectionEntry).values({ printingCode: 'OGN-030a', quantity: 1 }).run();

    db.delete(expansion).run();

    expect(db.select().from(printing).all()).toEqual([]);
    expect(db.select().from(collectionEntry).all()).toHaveLength(1);
  });
});
