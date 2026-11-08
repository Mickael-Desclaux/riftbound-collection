import type { PrintingCode } from './printingCode';
import { newPriceRecords, priceKey, type CurrentPrice, type LastRecord } from './priceRecords';

const jinx = 'OGN-030a' as PrintingCode;

function price(overrides: Partial<CurrentPrice> = {}): CurrentPrice {
  return {
    printingCode: jinx,
    source: 'tcgplayer',
    finish: 'foil',
    referenceMetricValue: 2.95,
    metrics: { market: 2.95 },
    currency: 'USD',
    publishedAt: '2026-11-07T17:01:52.522Z',
    ...overrides,
  };
}

const last = (value: number, recordedAt: string): Map<string, LastRecord> =>
  new Map([[priceKey(price()), { value, recordedAt }]]);

describe('newPriceRecords', () => {
  it('enregistre le premier prix connu, daté par la source', () => {
    expect(newPriceRecords([price()], new Map())).toEqual([
      {
        printingCode: jinx,
        source: 'tcgplayer',
        finish: 'foil',
        recordedAt: '2026-11-07T17:01:52.522Z',
        value: 2.95,
      },
    ]);
  });

  it('n’enregistre rien quand la valeur n’a pas changé', () => {
    const later = price({ publishedAt: '2026-11-08T17:00:00.000Z' });

    expect(newPriceRecords([later], last(2.95, '2026-11-07T17:01:52.522Z'))).toEqual([]);
  });

  it('enregistre une valeur qui a changé', () => {
    const later = price({ referenceMetricValue: 3.1, publishedAt: '2026-11-08T17:00:00.000Z' });

    expect(newPriceRecords([later], last(2.95, '2026-11-07T17:01:52.522Z'))).toEqual([
      expect.objectContaining({ value: 3.1, recordedAt: '2026-11-08T17:00:00.000Z' }),
    ]);
  });

  it('ignore un prix absent', () => {
    expect(newPriceRecords([price({ referenceMetricValue: null })], new Map())).toEqual([]);
  });

  it('n’enregistre jamais deux relevés à la même date, ni à une date passée', () => {
    const sameDate = price({ referenceMetricValue: 3.1 });
    const older = price({ referenceMetricValue: 3.1, publishedAt: '2026-11-06T00:00:00.000Z' });

    expect(newPriceRecords([sameDate, older], last(2.95, '2026-11-07T17:01:52.522Z'))).toEqual([]);
  });

  it('suit chaque Version, Source et Finition séparément', () => {
    const normal = price({ finish: 'normal', referenceMetricValue: 0.5 });

    expect(newPriceRecords([normal], last(2.95, '2026-11-07T17:01:52.522Z'))).toHaveLength(1);
  });
});
