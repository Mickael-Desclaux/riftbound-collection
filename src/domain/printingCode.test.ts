import catalog from './__fixtures__/rifthunt-printings.json';
import { expansionCodeOf, printingCodeOf, type PrintingCode } from './printingCode';

const realPrintings = catalog.printings.map((row) => ({
  row,
  code: printingCodeOf({
    expansionCode: row.set,
    collectorNumber: row.collector_number,
    riftboundId: row.riftbound_id,
    name: row.name,
  }),
}));

function groupBy<T>(items: T[], keyOf: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    groups.set(keyOf(item), [...(groups.get(keyOf(item)) ?? []), item]);
  }
  return groups;
}

describe('expansionCodeOf', () => {
  it('donne le code d’Extension, premier segment du Code de version', () => {
    expect(expansionCodeOf('OGN-030a' as PrintingCode)).toBe('OGN');
    expect(expansionCodeOf('OPP-017-024-metal' as PrintingCode)).toBe('OPP');
  });
});

describe('printingCodeOf', () => {
  it("assemble le code d'Extension et le numéro de la Version", () => {
    expect(
      printingCodeOf({
        expansionCode: 'ogn',
        collectorNumber: '030a',
        riftboundId: 'ogn-030a-298',
        name: 'Jinx, Demolitionist (Alternate Art)',
      }),
    ).toBe('OGN-030a');
  });

  it('ajoute toujours la vague de promos aux Versions OPP', () => {
    expect(
      printingCodeOf({
        expansionCode: 'opp',
        collectorNumber: '001',
        riftboundId: 'opp-001-298',
        name: 'Blazing Scorcher',
      }),
    ).toBe('OPP-001-298');
  });

  it.each([
    ['pr', '036a', 'pr-036a-298', 'PR-036a-298'],
    ['jdg', '111', 'jdg-111-298', 'JDG-111-298'],
  ])(
    'ajoute aussi la vague aux autres Extensions promo à plusieurs vagues : %s-%s',
    (expansionCode, collectorNumber, riftboundId, expected) => {
      expect(printingCodeOf({ expansionCode, collectorNumber, riftboundId, name: 'Promo' })).toBe(
        expected,
      );
    },
  );

  it("n'ajoute rien quand une Version OPP n'a pas de vague (runes)", () => {
    expect(
      printingCodeOf({
        expansionCode: 'opp',
        collectorNumber: 'r04b',
        riftboundId: 'opp-r04b',
        name: 'Body Rune',
      }),
    ).toBe('OPP-r04b');
  });

  it.each(['ogn-001-298', 'opp-001-', 'opp-001-298-x', 'opp'])(
    'refuse un riftbound_id au format inattendu : %s',
    (riftboundId) => {
      expect(() =>
        printingCodeOf({ expansionCode: 'opp', collectorNumber: '001', riftboundId, name: 'X' }),
      ).toThrow(/riftbound_id/);
    },
  );

  it.each([
    ['opp-017-024', '017', 'Annie, Dark Child', 'OPP-017-024'],
    ['opp-017-024', '017', 'Annie, Dark Child (Metal)', 'OPP-017-024-metal'],
    ['opp-015-167', '015', 'Akali, Brash (Top 8)', 'OPP-015-167-top8'],
    ['opp-015-167', '015', 'Akali, Brash (Champion)', 'OPP-015-167-champion'],
  ])(
    "ajoute l'édition indiquée par le nom : %s « %s »",
    (riftboundId, collectorNumber, name, expected) => {
      expect(printingCodeOf({ expansionCode: 'opp', collectorNumber, riftboundId, name })).toBe(
        expected,
      );
    },
  );
});

describe('printingCodeOf sur le catalogue RiftHunt réel (2026-11-08)', () => {
  it('donne un code différent à chacune des 1 725 Versions', () => {
    const duplicates = [...groupBy(realPrintings, (p) => p.code)].filter(
      ([, group]) => group.length > 1,
    );

    expect(realPrintings).toHaveLength(1725);
    expect(duplicates).toEqual([]);
  });

  it('sépare les 24 paires de Versions OPP qui partagent un riftbound_id', () => {
    const sharedIds = [...groupBy(realPrintings, (p) => p.row.riftbound_id)].filter(
      ([, group]) => group.length > 1,
    );

    expect(sharedIds).toHaveLength(24);
    for (const [, group] of sharedIds) {
      expect(new Set(group.map((p) => p.code)).size).toBe(group.length);
    }
  });

  it('garde le suffixe du numéro des signatures, absent du riftbound_id', () => {
    const ahri = realPrintings.find((p) => p.row.riftbound_id === 'ogn-303*-298');

    expect(ahri?.code).toBe('OGN-303s');
  });
});
