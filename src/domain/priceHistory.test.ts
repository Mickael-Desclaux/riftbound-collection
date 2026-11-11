import type { ExchangeRate } from './exchangeRates';
import {
  convertSeries,
  dailySeries,
  firstRecordDay,
  isHistoryBuilding,
  percentChange,
  periodRange,
  priceChange,
  type HistoryRecord,
} from './priceHistory';

/** Relevés réels de Jinx (OGN-030a, TCGplayer foil), un peu espacés. */
const records: HistoryRecord[] = [
  { recordedAt: '2026-11-03T17:00:00.000Z', value: 2.8 },
  { recordedAt: '2026-11-05T17:00:00.000Z', value: 2.95 },
  { recordedAt: '2026-11-05T23:00:00.000Z', value: 3.1 },
  { recordedAt: '2026-11-08T17:00:00.000Z', value: 2.9 },
];

describe('dailySeries', () => {
  it('donne une valeur par jour, prolongée entre deux relevés', () => {
    expect(dailySeries(records, { start: '2026-11-03', end: '2026-11-09' })).toEqual([
      { date: '2026-11-03', value: 2.8 },
      { date: '2026-11-04', value: 2.8 },
      // Deux relevés le même jour : le dernier l'emporte.
      { date: '2026-11-05', value: 3.1 },
      { date: '2026-11-06', value: 3.1 },
      { date: '2026-11-07', value: 3.1 },
      { date: '2026-11-08', value: 2.9 },
      { date: '2026-11-09', value: 2.9 },
    ]);
  });

  it('commence au premier relevé quand la période remonte plus loin', () => {
    const series = dailySeries(records, { start: '2026-10-30', end: '2026-11-04' });

    expect(series.map((p) => p.date)).toEqual(['2026-11-03', '2026-11-04']);
  });

  it('reprend la valeur connue avant le début de la période', () => {
    const series = dailySeries(records, { start: '2026-11-06', end: '2026-11-07' });

    expect(series).toEqual([
      { date: '2026-11-06', value: 3.1 },
      { date: '2026-11-07', value: 3.1 },
    ]);
  });

  it('ne donne rien sans relevé', () => {
    expect(dailySeries([], { start: '2026-11-01', end: '2026-11-07' })).toEqual([]);
  });
});

describe('convertSeries', () => {
  const usdCad = (date: string, rate: number): ExchangeRate => ({
    date,
    baseCurrency: 'USD',
    quoteCurrency: 'CAD',
    rate,
    source: 'frankfurter',
  });
  const rates = [usdCad('2026-11-06', 1.4066), usdCad('2026-11-09', 1.4103)];

  it('convertit chaque point au taux de sa date (dernier taux ≤ ce jour)', () => {
    const points = [
      { date: '2026-11-08', value: 10 },
      { date: '2026-11-09', value: 10 },
    ];

    const converted = convertSeries(points, 'USD', 'CAD', rates);

    expect(converted.map((p) => p.date)).toEqual(['2026-11-08', '2026-11-09']);
    expect(converted[0]?.value).toBeCloseTo(14.066, 6);
    expect(converted[1]?.value).toBeCloseTo(14.103, 6);
  });

  it('écarte les jours sans taux connu, plutôt que d’inventer une conversion', () => {
    const converted = convertSeries([{ date: '2026-11-05', value: 10 }], 'USD', 'CAD', rates);

    expect(converted).toEqual([]);
  });

  it('garde les valeurs telles quelles dans la même devise', () => {
    expect(convertSeries([{ date: '2026-11-05', value: 3 }], 'EUR', 'EUR', [])).toEqual([
      { date: '2026-11-05', value: 3 },
    ]);
  });
});

describe('periodRange', () => {
  const today = '2026-11-11';

  it('remonte de la durée de la période, jusqu’à aujourd’hui', () => {
    expect(periodRange('7d', today, '2026-01-01')).toEqual({ start: '2026-11-04', end: today });
    expect(periodRange('30d', today, '2026-01-01')).toEqual({ start: '2026-10-12', end: today });
    expect(periodRange('90d', today, '2026-01-01')).toEqual({ start: '2026-08-13', end: today });
    expect(periodRange('1y', today, '2026-01-01')).toEqual({ start: '2025-11-11', end: today });
  });

  it('« Tout » part du premier relevé', () => {
    expect(periodRange('all', today, '2026-10-02')).toEqual({ start: '2026-10-02', end: today });
    expect(periodRange('all', today, undefined)).toEqual({ start: today, end: today });
  });

  it('« Dates… » garde les dates choisies, sans dépasser aujourd’hui', () => {
    expect(periodRange({ from: '2026-10-01', to: '2026-10-15' }, today, undefined)).toEqual({
      start: '2026-10-01',
      end: '2026-10-15',
    });
    expect(periodRange({ from: '2026-11-01', to: '2026-12-31' }, today, undefined)).toEqual({
      start: '2026-11-01',
      end: today,
    });
  });
});

describe('isHistoryBuilding', () => {
  it('signale un historique qui commence après le début de la période', () => {
    const range = { start: '2026-10-12', end: '2026-11-11' };

    expect(isHistoryBuilding(range, '2026-11-03')).toBe(true);
    expect(isHistoryBuilding(range, '2026-10-12')).toBe(false);
    expect(isHistoryBuilding(range, undefined)).toBe(false);
  });
});

describe('firstRecordDay', () => {
  it('donne le jour UTC du premier relevé, quel que soit l’ordre reçu', () => {
    expect(firstRecordDay([...records].reverse())).toBe('2026-11-03');
    expect(firstRecordDay([])).toBeUndefined();
  });
});

describe('priceChange', () => {
  it('compare la valeur du jour à celle d’il y a N jours, en %', () => {
    // 11-01 : rien ; 11-03 : 2,80 ; 11-10 : 2,90 → +3,57 % sur 7 jours.
    expect(priceChange(records, '2026-11-10', 7)).toBeCloseTo(3.5714, 3);
  });

  it('ne donne rien sans relevé au début de la période : pas assez d’historique', () => {
    expect(priceChange(records, '2026-11-09', 7)).toBeNull();
    expect(priceChange([], '2026-11-09', 7)).toBeNull();
  });
});

describe('percentChange', () => {
  it('donne la variation en %, ou rien sans valeur de départ', () => {
    expect(percentChange(4, 3)).toBeCloseTo(-25, 6);
    expect(percentChange(null, 3)).toBeNull();
    expect(percentChange(4, null)).toBeNull();
  });
});
