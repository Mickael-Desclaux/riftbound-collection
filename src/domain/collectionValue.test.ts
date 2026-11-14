import {
  collectionValue,
  collectionValueChange,
  collectionValueSeries,
  firstOwnedRecordDay,
  ownedPrintingsOf,
  type OwnedPrintingHistory,
} from './collectionValue';
import type { PrintingCode } from './printingCode';
import { entry } from './testing/catalogEntries';

const code = (value: string) => value as PrintingCode;

/** Un relevé à midi UTC du jour donné. */
const at = (date: string, value: number) => ({ recordedAt: `${date}T12:00:00.000Z`, value });

describe('collectionValue', () => {
  it('additionne quantité × prix et compte versions, cartes et Versions sans prix', () => {
    const entries = [
      entry('OGN-001', { ownedQuantity: 2, price: 1.5 }),
      entry('OGN-002', { ownedQuantity: 1, price: 10 }),
      entry('OGN-003', { ownedQuantity: 3, price: null }),
    ];

    expect(collectionValue(entries)).toEqual({
      value: 13,
      printingCount: 3,
      cardCount: 6,
      unpricedCount: 1,
    });
  });

  it('compte une Version inconnue parmi les Versions sans prix, hors de la valeur', () => {
    const entries = [
      entry('OGN-001', { ownedQuantity: 1, price: 4 }),
      entry('OGN-999', { ownedQuantity: 2, inCatalog: false, price: null }),
    ];

    expect(collectionValue(entries)).toEqual({
      value: 4,
      printingCount: 2,
      cardCount: 3,
      unpricedCount: 1,
    });
  });

  it('ignore les Versions non possédées', () => {
    expect(collectionValue([entry('OGN-001', { price: 4 })])).toEqual({
      value: 0,
      printingCount: 0,
      cardCount: 0,
      unpricedCount: 0,
    });
  });
});

describe('ownedPrintingsOf', () => {
  it('valorise chaque Version possédée par sa Finition de référence', () => {
    const entries = [
      entry('OGN-001', { ownedQuantity: 2, finishes: ['normal', 'foil'], price: 1 }),
      entry('OGN-002', { ownedQuantity: 1, finishes: ['foil'], price: 1 }),
      entry('OGN-003', { price: 1 }),
    ];

    expect(ownedPrintingsOf(entries)).toEqual([
      { printingCode: 'OGN-001', finish: 'normal', quantity: 2 },
      { printingCode: 'OGN-002', finish: 'foil', quantity: 1 },
    ]);
  });

  it('écarte les Versions inconnues, qui n’ont pas de prix', () => {
    const entries = [entry('OGN-999', { ownedQuantity: 1, inCatalog: false, finishes: [] })];

    expect(ownedPrintingsOf(entries)).toEqual([]);
  });

  it('écarte les Versions sans prix aujourd’hui, exclues de la valeur', () => {
    const entries = [entry('OGN-001', { ownedQuantity: 1, price: null })];

    expect(ownedPrintingsOf(entries)).toEqual([]);
  });
});

describe('collectionValueSeries', () => {
  const ownedPrintings = [
    { printingCode: code('OGN-001'), finish: 'normal' as const, quantity: 2 },
    { printingCode: code('OGN-002'), finish: 'foil' as const, quantity: 1 },
  ];

  it('additionne chaque jour quantité × valeur, prolongée entre deux relevés', () => {
    const history: OwnedPrintingHistory = new Map([
      ['OGN-001|normal', [at('2026-11-01', 1), at('2026-11-03', 2)]],
      ['OGN-002|foil', [at('2026-11-02', 10)]],
    ]);

    expect(
      collectionValueSeries(ownedPrintings, history, { start: '2026-11-01', end: '2026-11-04' }),
    ).toEqual([
      { date: '2026-11-01', value: 2 },
      { date: '2026-11-02', value: 12 },
      { date: '2026-11-03', value: 14 },
      { date: '2026-11-04', value: 14 },
    ]);
  });

  it("n'a pas de point les jours où aucune Version n'a encore de relevé", () => {
    const history: OwnedPrintingHistory = new Map([['OGN-002|foil', [at('2026-11-03', 10)]]]);

    expect(
      collectionValueSeries(ownedPrintings, history, { start: '2026-11-01', end: '2026-11-04' }),
    ).toEqual([
      { date: '2026-11-03', value: 10 },
      { date: '2026-11-04', value: 10 },
    ]);
  });

  it("ignore l'historique d'une autre Finition", () => {
    const history: OwnedPrintingHistory = new Map([['OGN-001|foil', [at('2026-11-01', 50)]]]);

    expect(
      collectionValueSeries(ownedPrintings, history, { start: '2026-11-01', end: '2026-11-01' }),
    ).toEqual([]);
  });
});

describe('collectionValueChange', () => {
  const ownedPrintings = [
    { printingCode: code('OGN-001'), finish: 'normal' as const, quantity: 2 },
    { printingCode: code('OGN-002'), finish: 'normal' as const, quantity: 1 },
  ];

  it('compare la valeur du jour à celle d’il y a 30 jours', () => {
    const history: OwnedPrintingHistory = new Map([
      ['OGN-001|normal', [at('2026-10-10', 5), at('2026-11-10', 10)]],
      ['OGN-002|normal', [at('2026-10-01', 10)]],
    ]);

    // Il y a 30 j : 2 × 5 + 10 = 20 ; aujourd'hui : 2 × 10 + 10 = 30.
    expect(collectionValueChange(ownedPrintings, history, '2026-11-14')).toBeCloseTo(50);
  });

  it('ne compare que les Versions qui avaient déjà un prix il y a 30 jours', () => {
    const history: OwnedPrintingHistory = new Map([
      ['OGN-001|normal', [at('2026-10-01', 5), at('2026-11-10', 6)]],
      ['OGN-002|normal', [at('2026-11-01', 1000)]],
    ]);

    expect(collectionValueChange(ownedPrintings, history, '2026-11-14')).toBeCloseTo(20);
  });

  it("vaut null sans historique d'il y a 30 jours", () => {
    const history: OwnedPrintingHistory = new Map([['OGN-001|normal', [at('2026-11-01', 5)]]]);

    expect(collectionValueChange(ownedPrintings, history, '2026-11-14')).toBeNull();
  });
});

describe('firstOwnedRecordDay', () => {
  it('donne le jour du plus ancien relevé des Versions possédées', () => {
    const ownedPrintings = [
      { printingCode: code('OGN-001'), finish: 'normal' as const, quantity: 1 },
      { printingCode: code('OGN-002'), finish: 'normal' as const, quantity: 1 },
    ];
    const history: OwnedPrintingHistory = new Map([
      ['OGN-001|normal', [at('2026-11-05', 1)]],
      ['OGN-002|normal', [at('2026-11-02', 1), at('2026-11-06', 2)]],
      ['OGN-003|normal', [at('2026-10-01', 1)]],
    ]);

    expect(firstOwnedRecordDay(ownedPrintings, history)).toBe('2026-11-02');
  });

  it('ne donne rien sans relevé', () => {
    expect(firstOwnedRecordDay([], new Map())).toBeUndefined();
  });
});
