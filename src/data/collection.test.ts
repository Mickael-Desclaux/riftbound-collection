import { collectionEntries } from '@/domain/collection';
import { withOwnedQuantities } from '@/domain/catalogEntry';
import type { PrintingCode } from '@/domain/printingCode';

import { replaceCatalog } from './catalog';
import { readCatalogEntries } from './catalogGrid';
import { readOwnedQuantities, setOwnedQuantity } from './collection';
import { catalogOf, expansionOf, printingOf } from './testing/catalogFactory';
import { createTestDatabase } from './testing/createTestDatabase';

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
    setOwnedQuantity(db, JINX, 2);
    setOwnedQuantity(db, GONE, 1);

    replaceCatalog(db, catalogOf([ogn], [printingOf('OGN', '030a', 'Jinx')]));

    const owned = readOwnedQuantities(db);
    const entries = collectionEntries(withOwnedQuantities(readCatalogEntries(db), owned), owned);
    expect(entries.map((e) => [e.printingCode, e.ownedQuantity, e.inCatalog])).toEqual([
      [JINX, 2, true],
      [GONE, 1, false],
    ]);
  });
});
