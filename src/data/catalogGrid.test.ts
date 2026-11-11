import { withOwnedQuantities } from '@/domain/catalogEntry';
import type { PrintingCode } from '@/domain/printingCode';

import { replaceCatalog } from './catalog';
import {
  readCatalogEntries,
  readFilterOptions,
  readOwnedQuantities,
  selectExpansionChips,
} from './catalogGrid';
import { collectionEntry } from './schema';
import { catalogOf, expansionOf, printingOf } from './testing/catalogFactory';
import { createTestDatabase } from './testing/createTestDatabase';

/** OGN (sortie en premier), SFD, puis OPP (promo, sans date). */
async function catalogDatabase() {
  const { db } = await createTestDatabase();
  replaceCatalog(
    db,
    catalogOf(
      [
        expansionOf('SFD', { name: 'Spiritforged', releasedAt: '2026-02-13' }),
        expansionOf('OGN', { name: 'Origins', releasedAt: '2025-10-31' }),
        expansionOf('OPP', { name: 'Organized Play', isPromo: true }),
      ],
      [
        { ...printingOf('OGN', '030a', 'Jinx'), rarity: 'epic', variant: 'alternate' as const },
        printingOf('SFD', '001', 'Ahri'),
        printingOf('OPP', '017', 'Annie'),
      ],
    ),
  );
  return db;
}

describe('readCatalogEntries', () => {
  it('donne toutes les Versions, avec leur Extension, leur Carte et leur rang de sortie', async () => {
    const db = await catalogDatabase();

    const entries = readCatalogEntries(db);

    expect(entries.map((e) => [e.printingCode, e.expansionRank, e.isPromo])).toEqual(
      expect.arrayContaining([
        ['OGN-030a', 0, false],
        ['SFD-001', 1, false],
        ['OPP-017', 2, true],
      ]),
    );
    expect(entries.find((e) => e.printingCode === 'OGN-030a')).toMatchObject({
      name: 'Jinx',
      rarity: 'epic',
      variant: 'alternate',
      type: 'Unit',
      domains: [],
      ownedQuantity: 0,
      price: null,
    });
    expect(entries.find((e) => e.printingCode === 'OGN-030a')?.finishes).toEqual(
      printingOf('OGN', '030a', 'Jinx').finishes,
    );
  });

  it('donne la quantité possédée d’après la Collection', async () => {
    const db = await catalogDatabase();
    db.insert(collectionEntry)
      .values({ printingCode: 'SFD-001' as PrintingCode, quantity: 3 })
      .run();

    const entries = withOwnedQuantities(readCatalogEntries(db), readOwnedQuantities(db));
    const ahri = entries.find((e) => e.printingCode === 'SFD-001');

    expect(ahri?.ownedQuantity).toBe(3);
  });
});

describe('readFilterOptions', () => {
  it('liste les valeurs présentes dans le Catalogue, pour la feuille de filtres', async () => {
    const db = await catalogDatabase();

    expect(readFilterOptions(db)).toEqual({
      rarities: ['common', 'epic'],
      types: ['Unit'],
      domains: [],
    });
  });
});

describe('selectExpansionChips', () => {
  it('liste les Extensions dans l’ordre de sortie, sans les promos par défaut', async () => {
    const db = await catalogDatabase();

    expect(selectExpansionChips(db, false).all()).toEqual([
      { code: 'OGN', name: 'Origins' },
      { code: 'SFD', name: 'Spiritforged' },
    ]);
    expect(
      selectExpansionChips(db, true)
        .all()
        .map((e) => e.code),
    ).toEqual(['OGN', 'SFD', 'OPP']);
  });
});
