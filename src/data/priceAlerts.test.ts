import type { IsoDateTime } from '@/domain/dates';
import type { PriceRecord } from '@/domain/priceRecords';
import type { PrintingCode } from '@/domain/printingCode';

import { replaceCatalog } from './catalog';
import { checkPriceAlerts } from './priceAlerts';
import { savePrices } from './prices';
import { wishlistEntry } from './schema';
import { setSetting } from './settings';
import { catalogOf, expansionOf, printingOf } from './testing/catalogFactory';
import { createTestDatabase } from './testing/createTestDatabase';
import { setWishlisted } from './wishlist';

const JINX = 'OGN-030a' as PrintingCode;
const AHRI = 'OGN-001' as PrintingCode;
const ADDED = '2026-11-01T12:00:00.000Z' as IsoDateTime;
const NOW = new Date('2026-11-14T09:00:00.000Z');

function record(
  printingCode: PrintingCode,
  day: string,
  value: number,
  overrides: Partial<PriceRecord> = {},
): PriceRecord {
  return {
    printingCode,
    source: 'tcgplayer',
    finish: 'normal',
    recordedAt: `${day}T08:00:00.000Z`,
    value,
    ...overrides,
  };
}

async function setup() {
  const { db } = await createTestDatabase();
  const foilOnlyAhri = { ...printingOf('OGN', '001', 'Ahri'), finishes: ['foil' as const] };
  replaceCatalog(
    db,
    catalogOf([expansionOf('OGN')], [printingOf('OGN', '030a', 'Jinx'), foilOnlyAhri]),
  );
  setWishlisted(db, JINX, ADDED);
  setWishlisted(db, AHRI, ADDED);
  return db;
}

describe('checkPriceAlerts', () => {
  it('signale les souhaits qui ont baissé du seuil, dans la Finition de référence, et retient l’alerte', async () => {
    const db = await setup();
    savePrices(
      db,
      'tcgplayer',
      [],
      [
        record(JINX, '2026-10-20', 10),
        record(JINX, '2026-11-10', 8),
        // Ahri n'existe qu'en foil : sa normale (incohérente) ne compte pas.
        record(AHRI, '2026-10-20', 4, { finish: 'normal' }),
        record(AHRI, '2026-11-10', 1, { finish: 'normal' }),
        record(AHRI, '2026-10-20', 5, { finish: 'foil' }),
      ],
    );

    expect(checkPriceAlerts(db, NOW)).toEqual([
      { printingCode: JINX, cardName: 'Jinx', change: expect.closeTo(-20) },
    ]);
    expect(db.select().from(wishlistEntry).all()).toContainEqual({
      printingCode: JINX,
      addedAt: ADDED,
      lastAlertPrice: 8,
      lastAlertSource: 'tcgplayer',
      lastAlertAt: NOW.toISOString(),
    });

    // Rien de nouveau depuis : pas de seconde alerte.
    expect(checkPriceAlerts(db, NOW)).toEqual([]);
  });

  it('suit la Source de prix et le seuil choisis', async () => {
    const db = await setup();
    setSetting(db, 'priceSource', 'cardmarket');
    setSetting(db, 'priceAlertThreshold', 30);
    savePrices(
      db,
      'tcgplayer',
      [],
      [record(JINX, '2026-10-20', 10), record(JINX, '2026-11-10', 1)],
    );
    savePrices(
      db,
      'cardmarket',
      [],
      [
        record(JINX, '2026-10-20', 10, { source: 'cardmarket' }),
        record(JINX, '2026-11-10', 7.5, { source: 'cardmarket' }),
      ],
    );

    expect(checkPriceAlerts(db, NOW)).toEqual([]);
  });

  it('ignore les Versions inconnues, sans prix ni nom', async () => {
    const db = await setup();
    const unknown = 'XXX-999' as PrintingCode;
    setWishlisted(db, unknown, ADDED);
    savePrices(
      db,
      'tcgplayer',
      [],
      [record(unknown, '2026-10-20', 10), record(unknown, '2026-11-10', 1)],
    );

    expect(checkPriceAlerts(db, NOW)).toEqual([]);
  });
});
