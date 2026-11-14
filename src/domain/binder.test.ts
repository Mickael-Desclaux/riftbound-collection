import type { PrintingCode } from './printingCode';
import { binderEntries, binderPages } from './binder';
import { entry } from './testing/catalogEntries';

const codes = (count: number, expansion = 'OGN') =>
  Array.from({ length: count }, (_, i) => entry(`${expansion}-${String(i + 1).padStart(3, '0')}`));

describe('binderPages', () => {
  it('range les cartes par pages de 3 × 3, la dernière page incomplète', () => {
    const pages = binderPages(codes(10));

    expect(pages.map((page) => page.printings.length)).toEqual([9, 1]);
    expect(pages.map((page) => [page.number, page.count])).toEqual([
      [1, 2],
      [2, 2],
    ]);
  });

  it('commence chaque Extension sur une nouvelle page, numérotée dans son Extension', () => {
    const pages = binderPages([
      ...codes(2),
      ...codes(10, 'SFD').map((e) => ({ ...e, expansionRank: 1 })),
    ]);

    expect(
      pages.map((page) => [page.expansionCode, page.number, page.count, page.printings.length]),
    ).toEqual([
      ['OGN', 1, 1, 2],
      ['SFD', 1, 2, 9],
      ['SFD', 2, 2, 1],
    ]);
  });

  it("suit l'ordre de sortie des Extensions puis le numéro, quel que soit l'ordre reçu", () => {
    const pages = binderPages([
      entry('SFD-002', { expansionRank: 1 }),
      entry('OGN-010'),
      entry('SFD-001', { expansionRank: 1 }),
      entry('OGN-002a'),
      entry('OGN-002'),
    ]);

    expect(pages.map((page) => page.printings.map((p) => p.printingCode))).toEqual([
      ['OGN-002', 'OGN-002a', 'OGN-010'],
      ['SFD-001', 'SFD-002'],
    ]);
  });

  it('place une Version inconnue à la fin de son Extension, ou en dernier si son Extension a disparu', () => {
    const unknown = { inCatalog: false, expansionRank: Number.MAX_SAFE_INTEGER };
    const pages = binderPages([
      entry('OLD-001', unknown),
      entry('OGN-002', unknown),
      entry('SFD-001', { expansionRank: 1 }),
      entry('OGN-001'),
    ]);

    expect(pages.map((page) => page.printings.map((p) => p.printingCode))).toEqual([
      ['OGN-001', 'OGN-002'],
      ['SFD-001'],
      ['OLD-001'],
    ]);
  });
});

describe('binderEntries', () => {
  it('garde les Versions de la Sélection du classeur, inconnues comprises', () => {
    const selection = new Set(['OGN-002', 'OGN-999'] as PrintingCode[]);
    const owned = new Map([['OGN-999' as PrintingCode, 2]]);

    const entries = binderEntries(
      [entry('OGN-001'), entry('OGN-002')],
      selection,
      owned,
      new Map(),
    );

    expect(entries.map((e) => [e.printingCode, e.inCatalog, e.ownedQuantity])).toEqual([
      ['OGN-002', true, 0],
      ['OGN-999', false, 2],
    ]);
  });
});
