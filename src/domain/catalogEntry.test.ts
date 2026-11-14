import { withOwnedQuantities, withPriceChanges, withPrices } from './catalogEntry';
import type { ExchangeRate } from './exchangeRates';
import { entry } from './testing/catalogEntries';

describe('withOwnedQuantities', () => {
  it('donne à chaque Version sa quantité dans la Collection, 0 sinon', () => {
    const entries = [entry('OGN-001'), entry('OGN-002')];

    const result = withOwnedQuantities(entries, new Map([['OGN-002', 3]]));

    expect(result.map((e) => e.ownedQuantity)).toEqual([0, 3]);
  });
});

describe('withPrices', () => {
  const rates: ExchangeRate[] = [
    {
      date: '2026-11-10',
      baseCurrency: 'USD',
      quoteCurrency: 'CAD',
      rate: 1.4136,
      source: 'frankfurter',
    },
  ];

  it('donne à chaque Version le prix de sa Finition de référence, converti', () => {
    const entries = [
      entry('OGN-001', { finishes: ['normal', 'foil'] }),
      entry('OGN-002', { finishes: ['foil'] }),
      entry('OGN-003'),
    ];
    const prices = new Map([
      ['OGN-001', { normal: { value: 10, currency: 'USD' as const } }],
      ['OGN-002', { foil: { value: 2, currency: 'USD' as const } }],
    ]);

    const result = withPrices(entries, prices, 'CAD', rates);

    expect(result.map((e) => e.price)).toEqual([14.136, 2.8272, null]);
  });
});

describe('withPriceChanges', () => {
  it('donne la Variation de prix 7 j / 30 j de la Finition de référence, en devise d’origine', () => {
    const entries = [
      entry('OGN-001', { finishes: ['normal', 'foil'] }),
      entry('OGN-002', { finishes: ['foil'] }),
    ];
    const values = {
      today: new Map([
        ['OGN-001|normal', 11],
        ['OGN-001|foil', 50],
        ['OGN-002|foil', 3],
      ]),
      daysAgo7: new Map([
        ['OGN-001|normal', 10],
        ['OGN-002|foil', 4],
      ]),
      daysAgo30: new Map([['OGN-001|foil', 40]]),
    };

    const result = withPriceChanges(entries, values);

    expect(result[0]?.priceChange7d).toBeCloseTo(10, 6);
    // Le prix foil a varié sur 30 jours, mais la Finition de référence est la normale.
    expect(result[0]?.priceChange30d).toBeNull();
    expect(result[1]?.priceChange7d).toBeCloseTo(-25, 6);
  });
});
