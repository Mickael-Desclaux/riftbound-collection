import type { PrintingCode } from '@/domain/printingCode';

import { replaceCatalog } from './catalog';
import {
  readPrintingDetail,
  readPrintingState,
  setInBinderSelection,
  setWishlisted,
} from './printingDetail';
import { setOwnedQuantity } from './collection';
import { savePrices } from './prices';
import { catalogOf, expansionOf, printingOf } from './testing/catalogFactory';
import { createTestDatabase } from './testing/createTestDatabase';

const JINX = 'OGN-030a' as PrintingCode;

/** Jinx en deux Versions (OGN-030 et OGN-030a), et Ahri à part. */
async function catalogDatabase() {
  const { db } = await createTestDatabase();
  replaceCatalog(
    db,
    catalogOf(
      [expansionOf('OGN', { name: 'Origins' })],
      [
        {
          ...printingOf('OGN', '030a', 'Jinx'),
          rarity: 'epic',
          variant: 'alternate' as const,
          finishes: ['foil'],
          artist: 'Envar Studio',
          tcgId: 652803,
        },
        printingOf('OGN', '030', 'Jinx'),
        printingOf('OGN', '255', 'Ahri'),
      ],
    ),
  );
  return db;
}

describe('readPrintingDetail', () => {
  it('donne la Version avec sa Carte, son Extension et ses autres versions', async () => {
    const db = await catalogDatabase();

    const detail = readPrintingDetail(db, JINX);

    expect(detail).toMatchObject({
      printingCode: 'OGN-030a',
      name: 'Jinx',
      expansionName: 'Origins',
      collectorNumber: '030a',
      rarity: 'epic',
      variant: 'alternate',
      finishes: ['foil'],
      type: 'Unit',
      artist: 'Envar Studio',
      tcgId: 652803,
      cardmarketProductId: null,
    });
    expect(detail?.otherPrintings.map((p) => p.printingCode)).toEqual(['OGN-030']);
  });

  it('donne les prix du jour des deux sources, par Finition', async () => {
    const db = await catalogDatabase();
    const price = (source: 'tcgplayer' | 'cardmarket', value: number) => ({
      printingCode: JINX,
      source,
      finish: 'foil' as const,
      referenceMetricValue: value,
      metrics: {},
      currency: source === 'tcgplayer' ? ('USD' as const) : ('EUR' as const),
      publishedAt: '2026-11-11T01:45:56.000Z',
    });
    savePrices(db, 'tcgplayer', [price('tcgplayer', 2.95)], []);
    savePrices(db, 'cardmarket', [price('cardmarket', 3.52)], []);

    expect(readPrintingDetail(db, JINX)?.prices).toEqual({
      tcgplayer: {
        foil: { value: 2.95, currency: 'USD', publishedAt: '2026-11-11T01:45:56.000Z' },
      },
      cardmarket: {
        foil: { value: 3.52, currency: 'EUR', publishedAt: '2026-11-11T01:45:56.000Z' },
      },
    });
  });

  it('ne donne rien pour un Code de version absent du Catalogue', async () => {
    const db = await catalogDatabase();

    expect(readPrintingDetail(db, 'OGN-999' as PrintingCode)).toBeUndefined();
  });
});

describe('actions de la fiche', () => {
  it('règle la quantité possédée, et retire la Version de la Collection à 0', async () => {
    const db = await catalogDatabase();

    setOwnedQuantity(db, JINX, 2);
    expect(readPrintingState(db, JINX).quantity).toBe(2);

    setOwnedQuantity(db, JINX, 0);
    expect(readPrintingState(db, JINX).quantity).toBe(0);
  });

  it('ajoute aux souhaits avec la date d’ajout, puis les retire', async () => {
    const db = await catalogDatabase();

    setWishlisted(db, JINX, '2026-11-11T12:00:00.000Z');
    expect(readPrintingState(db, JINX).wishlistedAt).toBe('2026-11-11T12:00:00.000Z');

    setWishlisted(db, JINX, null);
    expect(readPrintingState(db, JINX).wishlistedAt).toBeNull();
  });

  it('garde la date d’ajout d’origine si la Version est déjà en souhait', async () => {
    const db = await catalogDatabase();

    setWishlisted(db, JINX, '2026-11-11T12:00:00.000Z');
    setWishlisted(db, JINX, '2026-11-12T12:00:00.000Z');

    expect(readPrintingState(db, JINX).wishlistedAt).toBe('2026-11-11T12:00:00.000Z');
  });

  it('ajoute la Version à la Sélection du classeur, puis l’en retire', async () => {
    const db = await catalogDatabase();

    setInBinderSelection(db, JINX, true);
    expect(readPrintingState(db, JINX).inBinderSelection).toBe(true);

    setInBinderSelection(db, JINX, false);
    expect(readPrintingState(db, JINX).inBinderSelection).toBe(false);
  });
});
