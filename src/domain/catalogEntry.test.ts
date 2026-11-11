import { withOwnedQuantities, withPrices } from './catalogEntry';
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
