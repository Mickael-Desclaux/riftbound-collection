import { collectionEntries } from '@/domain/collection';
import { withOwnedQuantities } from '@/domain/catalogEntry';
import type { PrintingCode } from '@/domain/printingCode';

import { replaceCatalog } from './catalog';
import { readCatalogEntries } from './catalogGrid';
import {
  readCollectionEntry,
  readOwnedQuantities,
  restoreCollectionEntry,
  setOwnedQuantity,
} from './collection';
import { catalogOf, expansionOf, printingOf } from './testing/catalogFactory';
import { createTestDatabase } from './testing/createTestDatabase';

/** Entrée dans la Collection, pour les tests. */
const ENTERED = new Date('2026-11-01T10:00:00.000Z');

const JINX = 'OGN-030a' as PrintingCode;
const GONE = 'OGN-999' as PrintingCode;

describe('Collection', () => {
  it('garde une Version qui a quitté le Catalogue : elle devient une Version inconnue', async () => {
    const { db } = await createTestDatabase();
    const ogn = expansionOf('OGN', { name: 'Origins', releasedAt: '2025-10-31' });
    replaceCatalog(
      db,
      catalogOf([ogn], [printingOf('OGN', '030a', 'Jinx'), printingOf('OGN', '999', 'Ghost')]),
    );
    setOwnedQuantity(db, JINX, 2, ENTERED);
    setOwnedQuantity(db, GONE, 1, ENTERED);

    replaceCatalog(db, catalogOf([ogn], [printingOf('OGN', '030a', 'Jinx')]));

    const owned = readOwnedQuantities(db);
    const entries = collectionEntries(withOwnedQuantities(readCatalogEntries(db), owned), owned);
    expect(entries.map((e) => [e.printingCode, e.ownedQuantity, e.inCatalog])).toEqual([
      [JINX, 2, true],
      [GONE, 1, false],
    ]);
  });

  it('date l’entrée dans la Collection, et la garde quand la quantité change', async () => {
    const { db } = await createTestDatabase();

    setOwnedQuantity(db, JINX, 1, ENTERED);
    setOwnedQuantity(db, JINX, 3, new Date('2026-11-10T10:00:00.000Z'));

    expect(readCollectionEntry(db, JINX)).toEqual({
      printingCode: JINX,
      quantity: 3,
      addedAt: ENTERED.toISOString(),
      lastAlertPrice: null,
      lastAlertSource: null,
      lastAlertAt: null,
    });
  });

  it('repart du nouveau jour d’entrée pour une Version retirée puis remise', async () => {
    const { db } = await createTestDatabase();
    setOwnedQuantity(db, JINX, 1, ENTERED);

    setOwnedQuantity(db, JINX, 0, ENTERED);
    setOwnedQuantity(db, JINX, 1, new Date('2026-11-10T10:00:00.000Z'));

    expect(readCollectionEntry(db, JINX)?.addedAt).toBe('2026-11-10T10:00:00.000Z');
  });

  it('« Annuler » rend la ligne retirée telle quelle, avec sa dernière Alerte de prix', async () => {
    const { db } = await createTestDatabase();
    const entry = {
      printingCode: JINX,
      quantity: 2,
      addedAt: ENTERED.toISOString(),
      lastAlertPrice: 12,
      lastAlertSource: 'tcgplayer',
      lastAlertAt: '2026-11-12T08:00:00.000Z',
    } as const;
    restoreCollectionEntry(db, entry);
    setOwnedQuantity(db, JINX, 0, ENTERED);

    restoreCollectionEntry(db, entry);

    expect(readCollectionEntry(db, JINX)).toEqual(entry);
  });
});
