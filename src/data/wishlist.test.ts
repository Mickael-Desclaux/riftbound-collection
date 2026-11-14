import type { IsoDateTime } from '@/domain/dates';
import type { PrintingCode } from '@/domain/printingCode';

import { readOwnedQuantities, setOwnedQuantity } from './collection';
import { readWishlistPriceHistory, savePrices } from './prices';
import { wishlistEntry } from './schema';
import { createTestDatabase } from './testing/createTestDatabase';
import { readWishlist, restoreWishlistEntry, setWishlisted } from './wishlist';

const JINX = 'OGN-030a' as PrintingCode;
const AHRI = 'SFD-001' as PrintingCode;
const ADDED = '2026-11-11T12:00:00.000Z' as IsoDateTime;

describe('Liste de souhaits', () => {
  it('ajoute aux souhaits avec la date d’ajout, puis les retire', async () => {
    const { db } = await createTestDatabase();

    setWishlisted(db, JINX, ADDED);
    expect(readWishlist(db)).toEqual(new Map([[JINX, ADDED]]));

    setWishlisted(db, JINX, null);
    expect(readWishlist(db)).toEqual(new Map());
  });

  it('garde la date d’ajout d’origine si la Version est déjà en souhait', async () => {
    const { db } = await createTestDatabase();

    setWishlisted(db, JINX, ADDED);
    setWishlisted(db, JINX, '2026-11-12T12:00:00.000Z');

    expect(readWishlist(db).get(JINX)).toBe(ADDED);
  });
});

describe('retrait automatique des souhaits', () => {
  it('retire une Version qui passe de 0 à 1 exemplaire, et rend son souhait pour « Annuler »', async () => {
    const { db } = await createTestDatabase();
    db.insert(wishlistEntry)
      .values({
        printingCode: JINX,
        addedAt: ADDED,
        lastAlertPrice: 4,
        lastAlertSource: 'tcgplayer',
        lastAlertAt: '2026-11-12T08:00:00.000Z',
      })
      .run();

    const removed = setOwnedQuantity(db, JINX, 1);

    expect(readWishlist(db)).toEqual(new Map());
    expect(readOwnedQuantities(db).get(JINX)).toBe(1);

    restoreWishlistEntry(db, removed!);
    expect(db.select().from(wishlistEntry).all()).toEqual([
      {
        printingCode: JINX,
        addedAt: ADDED,
        lastAlertPrice: 4,
        lastAlertSource: 'tcgplayer',
        lastAlertAt: '2026-11-12T08:00:00.000Z',
      },
    ]);
  });

  it('laisse en souhait une Version déjà possédée dont la quantité change', async () => {
    const { db } = await createTestDatabase();
    setOwnedQuantity(db, JINX, 1);
    setWishlisted(db, JINX, ADDED);

    expect(setOwnedQuantity(db, JINX, 2)).toBeNull();
    expect(setOwnedQuantity(db, JINX, 0)).toBeNull();
    expect(readWishlist(db).get(JINX)).toBe(ADDED);
  });

  it('ne rend rien pour une Version qui n’était pas en souhait', async () => {
    const { db } = await createTestDatabase();

    expect(setOwnedQuantity(db, JINX, 1)).toBeNull();
  });
});

describe('readWishlistPriceHistory', () => {
  it('donne, pour une source, les Relevés de prix des seuls souhaits', async () => {
    const { db } = await createTestDatabase();
    const record = (printingCode: PrintingCode, recordedAt: string, value: number) => ({
      printingCode,
      source: 'tcgplayer' as const,
      finish: 'normal' as const,
      recordedAt: recordedAt as IsoDateTime,
      value,
    });
    savePrices(
      db,
      'tcgplayer',
      [],
      [
        record(JINX, '2026-11-03T00:00:00.000Z', 2),
        record(JINX, '2026-11-01T00:00:00.000Z', 1),
        record(AHRI, '2026-11-01T00:00:00.000Z', 5),
      ],
    );
    setWishlisted(db, JINX, ADDED);

    expect(readWishlistPriceHistory(db, 'tcgplayer')).toEqual(
      new Map([
        [
          'OGN-030a|normal',
          [
            { recordedAt: '2026-11-01T00:00:00.000Z', value: 1 },
            { recordedAt: '2026-11-03T00:00:00.000Z', value: 2 },
          ],
        ],
      ]),
    );
    expect(readWishlistPriceHistory(db, 'cardmarket')).toEqual(new Map());
  });
});
