import type { CatalogEntry } from './catalogEntry';
import { entry } from './testing/catalogEntries';
import {
  activeFilters,
  DEFAULT_CATALOG_FILTERS,
  filterCatalog,
  removeActiveFilter,
  type CatalogFilters,
} from './catalogFilters';

const filters = (overrides: Partial<CatalogFilters> = {}): CatalogFilters => ({
  ...DEFAULT_CATALOG_FILTERS,
  ...overrides,
});
const codes = (entries: CatalogEntry[]) => entries.map((e) => e.printingCode);

describe('filterCatalog', () => {
  it('masque les Extensions promo par défaut', () => {
    const entries = [entry('OGN-001'), entry('OPP-017-024', { isPromo: true })];

    expect(codes(filterCatalog(entries, filters()))).toEqual(['OGN-001']);
    expect(codes(filterCatalog(entries, filters({ showPromo: true })))).toEqual([
      'OGN-001',
      'OPP-017-024',
    ]);
  });

  const mixed = [
    entry('OGN-001', { rarity: 'common', variant: 'normal', type: 'Unit', domains: ['fury'] }),
    entry('OGN-030a', { rarity: 'epic', variant: 'alternate', type: 'Spell', domains: ['mind'] }),
    entry('SFD-010', {
      rarity: 'rare',
      variant: 'signature',
      type: 'Gear',
      domains: ['calm', 'mind'],
    }),
  ];

  it.each<[string, Partial<CatalogFilters>, string[]]>([
    ['Extension', { expansionCodes: ['SFD'] }, ['SFD-010']],
    ['rareté', { rarities: ['epic', 'rare'] }, ['OGN-030a', 'SFD-010']],
    ['version', { variants: ['alternate'] }, ['OGN-030a']],
    ['type', { types: ['Unit', 'Gear'] }, ['OGN-001', 'SFD-010']],
    [
      'domaine (une Carte à plusieurs domaines suffit d’un seul)',
      { domains: ['mind'] },
      ['OGN-030a', 'SFD-010'],
    ],
  ])('garde les Versions qui ont l’une des valeurs choisies : %s', (_, criterion, expected) => {
    expect(codes(filterCatalog(mixed, filters(criterion)))).toEqual(expected);
  });

  it('exige tous les critères à la fois', () => {
    const result = filterCatalog(mixed, filters({ domains: ['mind'], rarities: ['rare'] }));

    expect(codes(result)).toEqual(['SFD-010']);
  });

  it.each<[CatalogFilters['ownership'], string[]]>([
    ['all', ['OGN-001', 'OGN-002']],
    ['owned', ['OGN-002']],
    ['missing', ['OGN-001']],
  ])('possédées / manquantes : %s', (ownership, expected) => {
    const entries = [entry('OGN-001'), entry('OGN-002', { ownedQuantity: 3 })];

    expect(codes(filterCatalog(entries, filters({ ownership })))).toEqual(expected);
  });

  it('cherche dans le nom ou le Code de version, sans casse ni accents', () => {
    const entries = [
      entry('OGN-001', { name: 'Jinx, Demolitionist' }),
      entry('SFD-002', { name: 'Kai’Sa, Évolutive' }),
      entry('OGN-303s', { name: 'Ahri, Nine-Tailed Fox' }),
    ];

    expect(codes(filterCatalog(entries, filters({ search: ' JINX ' })))).toEqual(['OGN-001']);
    expect(codes(filterCatalog(entries, filters({ search: 'evolu' })))).toEqual(['SFD-002']);
    expect(codes(filterCatalog(entries, filters({ search: 'ogn-303' })))).toEqual(['OGN-303s']);
    expect(filterCatalog(entries, filters({ search: '%' }))).toEqual([]);
  });

  it('confond les apostrophes et ignore les espaces en trop', () => {
    const entries = [entry('SFD-120', { name: "Kai'Sa, Daughter of the Void" })];

    expect(codes(filterCatalog(entries, filters({ search: 'kai’sa' })))).toEqual(['SFD-120']);
    expect(codes(filterCatalog(entries, filters({ search: 'daughter   of' })))).toEqual([
      'SFD-120',
    ]);
  });
});

describe('activeFilters', () => {
  const chosen = filters({
    search: 'jinx',
    expansionCodes: ['OGN'],
    showPromo: true,
    rarities: ['epic', 'rare'],
    ownership: 'missing',
  });

  it('donne une puce par valeur choisie, sans la recherche', () => {
    expect(activeFilters(chosen)).toEqual([
      { criterion: 'expansion', value: 'OGN' },
      { criterion: 'promo', value: 'shown' },
      { criterion: 'rarity', value: 'epic' },
      { criterion: 'rarity', value: 'rare' },
      { criterion: 'ownership', value: 'missing' },
    ]);
    expect(activeFilters(filters())).toEqual([]);
  });

  it('retire une seule valeur, et garde le reste', () => {
    const afterRare = removeActiveFilter(chosen, { criterion: 'rarity', value: 'rare' });
    const afterPromo = removeActiveFilter(chosen, { criterion: 'promo', value: 'shown' });
    const afterOwnership = removeActiveFilter(chosen, { criterion: 'ownership', value: 'missing' });

    expect(afterRare.rarities).toEqual(['epic']);
    expect(afterRare.search).toBe('jinx');
    expect(afterPromo.showPromo).toBe(false);
    expect(afterOwnership.ownership).toBe('all');
  });

  it('retirer « Extensions promo » retire aussi les Extensions promo choisies', () => {
    const withOpp = filters({ showPromo: true, expansionCodes: ['OGN', 'OPP'] });

    const result = removeActiveFilter(withOpp, { criterion: 'promo', value: 'shown' });

    expect(result).toMatchObject({ showPromo: false, expansionCodes: ['OGN'] });
  });
});
