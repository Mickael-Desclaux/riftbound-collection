import type { IsoDateTime } from '@/domain/dates';
import type { PriceRecord } from '@/domain/priceRecords';
import type { PrintingCode } from '@/domain/printingCode';

import { replaceCatalog } from './catalog';
import { setOwnedQuantity } from './collection';
import { findPriceAlerts, recordPriceAlerts } from './priceAlerts';
import { savePrices } from './prices';
import { collectionEntry, wishlistEntry } from './schema';
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

describe('findPriceAlerts et recordPriceAlerts', () => {
  it('trouve les souhaits qui ont baissé du seuil, dans la Finition de référence, puis retient l’alerte annoncée', async () => {
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

    const alerts = findPriceAlerts(db, 'drop', NOW);
    expect(alerts).toEqual([
      {
        printingCode: JINX,
        cardName: 'Jinx',
        direction: 'drop',
        source: 'tcgplayer',
        price: 8,
        change: expect.closeTo(-20),
      },
    ]);
    // Pas encore annoncée, donc pas encore retenue.
    expect(findPriceAlerts(db, 'drop', NOW)).toHaveLength(1);

    recordPriceAlerts(db, alerts, NOW);
    expect(db.select().from(wishlistEntry).all()).toContainEqual({
      printingCode: JINX,
      addedAt: ADDED,
      lastAlertPrice: 8,
      lastAlertSource: 'tcgplayer',
      lastAlertAt: NOW.toISOString(),
    });

    // Rien de nouveau depuis : pas de seconde alerte.
    expect(findPriceAlerts(db, 'drop', NOW)).toEqual([]);
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

    expect(findPriceAlerts(db, 'drop', NOW)).toEqual([]);
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

    expect(findPriceAlerts(db, 'drop', NOW)).toEqual([]);
  });
});

describe('findPriceAlerts et recordPriceAlerts, en hausse (Collection)', () => {
  async function owning() {
    const { db } = await createTestDatabase();
    replaceCatalog(
      db,
      catalogOf(
        [expansionOf('OGN')],
        [printingOf('OGN', '030a', 'Jinx'), printingOf('OGN', '001', 'Ahri')],
      ),
    );
    setOwnedQuantity(db, JINX, 2, new Date(ADDED));
    setOwnedQuantity(db, AHRI, 1, new Date(ADDED));
    // Un souhait, que les alertes de hausse ne doivent pas toucher.
    setWishlisted(db, 'OGN-002' as PrintingCode, ADDED);
    savePrices(
      db,
      'tcgplayer',
      [],
      [
        record(JINX, '2026-10-20', 10),
        record(JINX, '2026-11-10', 12),
        record(AHRI, '2026-10-20', 10),
        record(AHRI, '2026-11-10', 8),
      ],
    );
    return db;
  }

  it('trouve les Versions de la Collection qui ont monté du seuil, puis retient l’alerte annoncée', async () => {
    const db = await owning();

    const alerts = findPriceAlerts(db, 'rise', NOW);
    expect(alerts).toEqual([
      {
        printingCode: JINX,
        cardName: 'Jinx',
        direction: 'rise',
        source: 'tcgplayer',
        price: 12,
        change: expect.closeTo(20),
      },
    ]);

    recordPriceAlerts(db, alerts, NOW);
    expect(db.select().from(collectionEntry).all()).toContainEqual({
      printingCode: JINX,
      quantity: 2,
      addedAt: ADDED,
      lastAlertPrice: 12,
      lastAlertSource: 'tcgplayer',
      lastAlertAt: NOW.toISOString(),
    });
    expect(findPriceAlerts(db, 'rise', NOW)).toEqual([]);
    // Les souhaits n'en sont pas touchés.
    expect(db.select().from(wishlistEntry).all()).toEqual([
      expect.objectContaining({ lastAlertPrice: null }),
    ]);
  });

  it('suit son propre seuil, pas celui des souhaits', async () => {
    const db = await owning();
    setSetting(db, 'priceAlertThreshold', 50);
    setSetting(db, 'priceRiseAlertThreshold', 25);

    expect(findPriceAlerts(db, 'rise', NOW)).toEqual([]);
    expect(findPriceAlerts(db, 'drop', NOW)).toEqual([]);
  });
});
