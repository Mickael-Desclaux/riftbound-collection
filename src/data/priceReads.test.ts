import type { CurrentPrice } from '@/domain/priceRecords';
import type { PrintingCode } from '@/domain/printingCode';

import { readExchangeRates, saveExchangeRates } from './exchangeRates';
import { latestPublishedAt, readCurrentPrices, savePrices } from './prices';
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
