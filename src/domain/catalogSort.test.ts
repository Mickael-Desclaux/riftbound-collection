import type { CatalogEntry } from './catalogEntry';
import { sortCatalog } from './catalogSort';
import { entry } from './testing/catalogEntries';

const codes = (entries: CatalogEntry[]) => entries.map((e) => e.printingCode);

describe('sortCatalog', () => {
  const entries = [
    entry('SFD-001', { expansionRank: 1, name: 'Ahri, Alluring' }),
    entry('OPP-017-298', { expansionRank: 2, collectorNumber: '017', name: 'Zed' }),
    entry('OGN-030a', { expansionRank: 0, name: 'Jinx, Demolitionist' }),
    entry('OPP-017-024', { expansionRank: 2, collectorNumber: '017', name: 'Annie' }),
    entry('OGN-001', { expansionRank: 0, name: 'Jinx, Demolitionist' }),
  ];

  it('par numéro : Extension dans l’ordre de sortie, numéro, puis Code de version', () => {
    expect(codes(sortCatalog(entries, 'number'))).toEqual([
      'OGN-001',
      'OGN-030a',
      'SFD-001',
      'OPP-017-024',
      'OPP-017-298',
    ]);
  });

  it('par nom, puis par Code de version pour les homonymes', () => {
    expect(codes(sortCatalog(entries, 'name'))).toEqual([
      'SFD-001',
      'OPP-017-024',
      'OGN-001',
      'OGN-030a',
      'OPP-017-298',
    ]);
  });

  describe('par prix', () => {
    const priced = [
      entry('OGN-001', { price: 3 }),
      entry('OGN-002', { price: null }),
      entry('OGN-003', { price: 0.5 }),
      entry('OGN-004', { price: 3 }),
      entry('OGN-005', { price: 12 }),
    ];

    it('croissant, les prix absents en dernier', () => {
      expect(codes(sortCatalog(priced, 'priceAsc'))).toEqual([
        'OGN-003',
        'OGN-001',
        'OGN-004',
        'OGN-005',
        'OGN-002',
      ]);
    });

    it('décroissant, les prix absents toujours en dernier', () => {
      expect(codes(sortCatalog(priced, 'priceDesc'))).toEqual([
        'OGN-005',
        'OGN-001',
        'OGN-004',
        'OGN-003',
        'OGN-002',
      ]);
    });
  });

  it('ne modifie pas la liste reçue', () => {
    const before = codes(entries);

    sortCatalog(entries, 'name');

    expect(codes(entries)).toEqual(before);
  });
});
