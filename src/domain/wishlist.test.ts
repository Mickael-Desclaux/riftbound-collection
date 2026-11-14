import type { IsoDateTime } from './dates';
import type { PrintingFinishHistory } from './priceHistory';
import type { PrintingCode } from './printingCode';
import { entry } from './testing/catalogEntries';
import {
  leavesWishlist,
  wishlistCost,
  wishlistEntries,
  wishlistPriceChange,
  withWishlist,
} from './wishlist';

const code = (value: string) => value as PrintingCode;

const at = (day: string, value: number, time = '12:00:00.000Z') => ({
  recordedAt: `${day}T${time}` as IsoDateTime,
  value,
});
const added = (day: string) => `${day}T09:00:00.000Z` as IsoDateTime;

describe('wishlistPriceChange', () => {
  it("compare le prix d'aujourd'hui à celui du jour de l'ajout", () => {
    const records = [at('2026-11-01', 10), at('2026-11-05', 8)];

    expect(wishlistPriceChange(records, added('2026-11-03'), '2026-11-10')).toBe(-20);
  });
});

describe("wishlistPriceChange, sans relevé le jour de l'ajout", () => {
  it("part du premier relevé qui suit l'ajout", () => {
    const records = [at('2026-11-04', 10), at('2026-11-06', 12)];

    expect(wishlistPriceChange(records, added('2026-11-02'), '2026-11-10')).toBe(20);
  });

  it("n'a pas de variation sans aucun relevé", () => {
    expect(wishlistPriceChange([], added('2026-11-02'), '2026-11-10')).toBeNull();
  });

  it('ignore une baisse survenue avant le jour de l’ajout', () => {
    const records = [at('2026-11-01', 20), at('2026-11-02', 10)];

    expect(wishlistPriceChange(records, added('2026-11-03'), '2026-11-10')).toBe(0);
  });
});

describe('withWishlist', () => {
  it('marque les souhaits, avec la variation de leur Finition de référence depuis l’ajout', () => {
    const entries = [
      entry('OGN-001', { finishes: ['normal', 'foil'] }),
      entry('OGN-002', { finishes: ['foil'] }),
      entry('OGN-003'),
    ];
    const wishlist = new Map([
      [code('OGN-001'), added('2026-11-01')],
      [code('OGN-002'), added('2026-11-01')],
    ]);
    const history: PrintingFinishHistory = new Map([
      ['OGN-001|normal', [at('2026-11-01', 10), at('2026-11-05', 5)]],
      ['OGN-001|foil', [at('2026-11-01', 10), at('2026-11-05', 30)]],
      ['OGN-002|foil', [at('2026-11-01', 4), at('2026-11-05', 5)]],
      ['OGN-003|normal', [at('2026-11-01', 4), at('2026-11-05', 5)]],
    ]);

    expect(
      withWishlist(entries, wishlist, history, '2026-11-10').map((e) => [
        e.printingCode,
        e.wishlistedAt,
        e.wishlistPriceChange,
      ]),
    ).toEqual([
      ['OGN-001', added('2026-11-01'), -50],
      ['OGN-002', added('2026-11-01'), 25],
      ['OGN-003', null, null],
    ]);
  });
});

describe('wishlistEntries', () => {
  it('garde les souhaits, puis ceux qui ont quitté le Catalogue, en Versions inconnues', () => {
    const entries = [entry('OGN-001', { wishlistedAt: added('2026-11-01') }), entry('OGN-002')];
    const wishlist = new Map([
      [code('OGN-001'), added('2026-11-01')],
      [code('OGN-999'), added('2026-11-02')],
    ]);

    expect(
      wishlistEntries(entries, wishlist, new Map([[code('OGN-999'), 2]])).map((e) => [
        e.printingCode,
        e.inCatalog,
        e.wishlistedAt,
        e.ownedQuantity,
      ]),
    ).toEqual([
      ['OGN-001', true, added('2026-11-01'), 0],
      ['OGN-999', false, added('2026-11-02'), 2],
    ]);
  });
});

describe('wishlistCost', () => {
  it('additionne le prix de chaque souhait et compte à part ceux sans prix', () => {
    const wished = { wishlistedAt: added('2026-11-01') };
    const entries = [
      entry('OGN-001', { ...wished, price: 2.5 }),
      entry('OGN-002', { ...wished, price: 10 }),
      entry('OGN-003', { ...wished, price: null }),
      entry('OGN-004', { price: 100 }),
    ];

    expect(wishlistCost(entries)).toEqual({ printingCount: 3, total: 12.5, unpricedCount: 1 });
  });
});

describe('leavesWishlist', () => {
  it('retire des souhaits une Version qui passe de 0 à au moins 1 exemplaire', () => {
    expect(leavesWishlist(0, 1)).toBe(true);
    expect(leavesWishlist(0, 3)).toBe(true);
  });

  it('laisse en souhait une Version déjà possédée ou qui ne l’est plus', () => {
    expect(leavesWishlist(1, 2)).toBe(false);
    expect(leavesWishlist(2, 0)).toBe(false);
    expect(leavesWishlist(0, 0)).toBe(false);
  });
});
