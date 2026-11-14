import { completion, completionPercent } from './completion';
import { entry } from './testing/catalogEntries';

describe('completion', () => {
  it('compte, par Extension principale, les Versions distinctes possédées sur le total', () => {
    const entries = [
      entry('OGN-001', { ownedQuantity: 3 }),
      entry('OGN-002'),
      entry('OGN-003', { ownedQuantity: 1 }),
      entry('SFD-001', { expansionRank: 1 }),
    ];

    expect(completion(entries)).toEqual([
      { expansionCode: 'OGN', owned: 2, total: 3 },
      { expansionCode: 'SFD', owned: 0, total: 1 },
    ]);
  });

  it("suit l'ordre de sortie des Extensions", () => {
    const entries = [
      entry('SFD-001', { expansionRank: 2 }),
      entry('OGN-001', { expansionRank: 1 }),
    ];

    expect(completion(entries).map((c) => c.expansionCode)).toEqual(['OGN', 'SFD']);
  });

  it('écarte les Extensions promo et les Versions inconnues', () => {
    const entries = [
      entry('OGN-001', { ownedQuantity: 1 }),
      entry('OPP-001', { isPromo: true, ownedQuantity: 1 }),
      entry('OGN-999', { inCatalog: false, ownedQuantity: 1 }),
    ];

    expect(completion(entries)).toEqual([{ expansionCode: 'OGN', owned: 1, total: 1 }]);
  });
});

describe('completionPercent', () => {
  it('arrondit à l’entier inférieur : 100 % seulement quand tout est possédé', () => {
    expect(completionPercent({ expansionCode: 'OGN', owned: 54, total: 352 })).toBe(15);
    expect(completionPercent({ expansionCode: 'OGN', owned: 351, total: 352 })).toBe(99);
    expect(completionPercent({ expansionCode: 'OGN', owned: 29, total: 100 })).toBe(29);
    expect(completionPercent({ expansionCode: 'OGN', owned: 352, total: 352 })).toBe(100);
  });

  it('vaut 0 pour une Extension sans Version', () => {
    expect(completionPercent({ expansionCode: 'OGN', owned: 0, total: 0 })).toBe(0);
  });
});
