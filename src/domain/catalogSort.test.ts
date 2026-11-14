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

  describe('par Variation de prix', () => {
    const changing = [
      entry('OGN-001', { priceChange7d: 12, priceChange30d: -5 }),
      entry('OGN-002', { priceChange7d: null, priceChange30d: 40 }),
      entry('OGN-003', { priceChange7d: -8, priceChange30d: null }),
      entry('OGN-004', { priceChange7d: 3, priceChange30d: 2 }),
    ];

    it('sur 7 jours, croissant puis décroissant, sans historique en dernier', () => {
      expect(codes(sortCatalog(changing, 'change7dAsc'))).toEqual([
        'OGN-003',
        'OGN-004',
        'OGN-001',
        'OGN-002',
      ]);
      expect(codes(sortCatalog(changing, 'change7dDesc'))).toEqual([
        'OGN-001',
        'OGN-004',
        'OGN-003',
        'OGN-002',
      ]);
    });

    it('sur 30 jours', () => {
      expect(codes(sortCatalog(changing, 'change30dDesc'))).toEqual([
        'OGN-002',
        'OGN-004',
        'OGN-001',
        'OGN-003',
      ]);
    });
  });

  it('ne modifie pas la liste reçue', () => {
    const before = codes(entries);

    sortCatalog(entries, 'name');

    expect(codes(entries)).toEqual(before);
  });

  it('par valeur : quantité × prix, les Versions sans prix en dernier', () => {
    const owned = [
      entry('OGN-001', { ownedQuantity: 1, price: 5 }),
      entry('OGN-002', { ownedQuantity: 3, price: 2 }),
      entry('OGN-003', { ownedQuantity: 2, price: null }),
    ];

    expect(codes(sortCatalog(owned, 'valueDesc'))).toEqual(['OGN-002', 'OGN-001', 'OGN-003']);
  });

  it('place les Versions inconnues en fin de liste, quel que soit le tri', () => {
    const mixed = [
      entry('AAA-001', { inCatalog: false, name: 'AAA-001' }),
      entry('OGN-002', { name: 'Zed' }),
    ];

    expect(codes(sortCatalog(mixed, 'name'))).toEqual(['OGN-002', 'AAA-001']);
    expect(codes(sortCatalog(mixed, 'number'))).toEqual(['OGN-002', 'AAA-001']);
  });
});
