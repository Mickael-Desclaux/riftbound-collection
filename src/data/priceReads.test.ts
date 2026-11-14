import type { CurrentPrice } from '@/domain/priceRecords';
import type { PrintingCode } from '@/domain/printingCode';

import { readExchangeRates, saveExchangeRates } from './exchangeRates';
import {
  latestPublishedAt,
  readCurrentPrices,
  readPrintingHistory,
  referenceMetricValuesOn,
  savePrices,
} from './prices';
import { createTestDatabase } from './testing/createTestDatabase';

const price = (code: string, overrides: Partial<CurrentPrice> = {}): CurrentPrice => ({
  printingCode: code as PrintingCode,
  source: 'tcgplayer',
  finish: 'normal',
  referenceMetricValue: 1,
  metrics: { market: 1 },
  currency: 'USD',
  publishedAt: '2026-11-08T17:00:00.000Z',
  ...overrides,
});

describe('readCurrentPrices', () => {
  it('donne, pour une source, la valeur de l’Indicateur de référence par Version et Finition', async () => {
    const { db } = await createTestDatabase();
    savePrices(
      db,
      'tcgplayer',
      [
        price('OGN-030a', { finish: 'normal', referenceMetricValue: 0.09 }),
        price('OGN-030a', { finish: 'foil', referenceMetricValue: null }),
      ],
      [],
    );
    savePrices(
      db,
      'cardmarket',
      [price('OGN-030a', { source: 'cardmarket', currency: 'EUR', referenceMetricValue: 0.2 })],
      [],
    );

    const prices = readCurrentPrices(db, 'tcgplayer');

    expect(prices.get('OGN-030a')).toEqual({
      normal: { value: 0.09, currency: 'USD' },
      foil: { value: null, currency: 'USD' },
    });
    expect(readCurrentPrices(db, 'cardmarket').get('OGN-030a')).toEqual({
      normal: { value: 0.2, currency: 'EUR' },
    });
  });
});

describe('latestPublishedAt', () => {
  it('donne la publication la plus récente d’une source, ou rien sans prix', async () => {
    const { db } = await createTestDatabase();
    savePrices(
      db,
      'tcgplayer',
      [
        price('OGN-001', { publishedAt: '2026-11-07T17:00:00.000Z' }),
        price('OGN-002', { publishedAt: '2026-11-08T17:00:00.000Z' }),
      ],
      [],
    );

    expect(latestPublishedAt(db, 'tcgplayer')).toBe('2026-11-08T17:00:00.000Z');
    expect(latestPublishedAt(db, 'cardmarket')).toBeUndefined();
  });
});

describe('readExchangeRates', () => {
  it('donne tous les taux enregistrés', async () => {
    const { db } = await createTestDatabase();
    const rate = {
      date: '2026-11-10',
      baseCurrency: 'USD',
      quoteCurrency: 'CAD',
      rate: 1.4136,
      source: 'frankfurter',
    } as const;
    saveExchangeRates(db, 'frankfurter', [], [rate]);

    expect(readExchangeRates(db)).toEqual([rate]);
  });
});

const record = (code: string, finish: 'normal' | 'foil', recordedAt: string, value: number) => ({
  printingCode: code as PrintingCode,
  source: 'tcgplayer' as const,
  finish,
  recordedAt,
  value,
});

/** Base avec trois relevés de Jinx (OGN-030a foil), un d'Ahri, et un relevé Cardmarket. */
async function historyDatabase() {
  const { db } = await createTestDatabase();
  savePrices(
    db,
    'tcgplayer',
    [],
    [
      record('OGN-030a', 'foil', '2026-11-03T17:00:00.000Z', 2.8),
      record('OGN-030a', 'foil', '2026-11-05T17:00:00.000Z', 3.1),
      record('OGN-030a', 'foil', '2026-11-08T17:00:00.000Z', 2.9),
      record('OGN-255', 'normal', '2026-11-04T17:00:00.000Z', 0.7),
    ],
  );
  savePrices(
    db,
    'cardmarket',
    [],
    [{ ...record('OGN-030a', 'foil', '2026-11-04T01:45:56.000Z', 3.5), source: 'cardmarket' }],
  );
  return db;
}

describe('readPrintingHistory', () => {
  it('donne les relevés d’une Version par Source et Finition, du plus ancien au plus récent', async () => {
    const db = await historyDatabase();

    expect(readPrintingHistory(db, 'OGN-030a' as PrintingCode)).toEqual({
      tcgplayer: {
        foil: [
          { recordedAt: '2026-11-03T17:00:00.000Z', value: 2.8 },
          { recordedAt: '2026-11-05T17:00:00.000Z', value: 3.1 },
          { recordedAt: '2026-11-08T17:00:00.000Z', value: 2.9 },
        ],
      },
      cardmarket: { foil: [{ recordedAt: '2026-11-04T01:45:56.000Z', value: 3.5 }] },
    });
  });
});

describe('referenceMetricValuesOn', () => {
  it('donne la valeur de chaque Version × Finition à la fin d’un jour (UTC)', async () => {
    const db = await historyDatabase();

    const values = referenceMetricValuesOn(db, 'tcgplayer', '2026-11-05');

    expect(values).toEqual(
      new Map([
        ['OGN-030a|foil', 3.1],
        ['OGN-255|normal', 0.7],
      ]),
    );
  });

  it('ignore les Versions dont l’historique commence plus tard', async () => {
    const db = await historyDatabase();

    expect(referenceMetricValuesOn(db, 'tcgplayer', '2026-11-03')).toEqual(
      new Map([['OGN-030a|foil', 2.8]]),
    );
  });
});
