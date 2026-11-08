import { DEFAULT_CATALOG_FILTERS, type CatalogFilters } from '@/domain/catalogFilters';

import { replaceCatalog } from './catalog';
import { selectCatalogCount, selectCatalogPage, selectExpansionChips } from './catalogGrid';
import { catalogOf, expansionOf, printingOf } from './testing/catalogFactory';
import { createTestDatabase } from './testing/createTestDatabase';

const number = (n: number) => String(n).padStart(3, '0');

/** 30 Versions OGN, 3 SFD (sorties après), 2 OPP (promo). */
async function catalogDatabase() {
  const { db } = await createTestDatabase();
  replaceCatalog(
    db,
    catalogOf(
      [
        expansionOf('SFD', { name: 'Spiritforged', releasedAt: '2026-02-13' }),
        expansionOf('OGN', { name: 'Origins', releasedAt: '2025-10-31' }),
        expansionOf('OPP', { name: 'Organized Play', isPromo: true }),
      ],
      [
        ...Array.from({ length: 30 }, (_, i) =>
          printingOf('OGN', number(30 - i), `Unit ${30 - i}`),
        ),
        printingOf('SFD', '001', 'Jinx, Rebel'),
        printingOf('SFD', '002', 'Ahri, Alluring'),
        printingOf('SFD', '003', 'Garen, Rugged'),
        printingOf('OPP', '017', 'Jinx, Rebel'),
        printingOf('OPP', '018', 'Lux, Crownguard'),
      ],
    ),
  );
  return db;
}

const filters = (overrides: Partial<CatalogFilters> = {}) => ({
  ...DEFAULT_CATALOG_FILTERS,
  ...overrides,
});
const codes = (rows: { printingCode: string }[]) => rows.map((row) => row.printingCode);

describe('selectCatalogPage', () => {
  it('donne la 1re page dans l’ordre des Extensions puis des numéros, sans les promos', async () => {
    const db = await catalogDatabase();

    const page = selectCatalogPage(db, filters(), 1).all();

    expect(page).toHaveLength(24);
    expect(codes(page).slice(0, 3)).toEqual(['OGN-001', 'OGN-002', 'OGN-003']);
    expect(page[0]).toMatchObject({ name: 'Unit 1', expansionCode: 'OGN', collectorNumber: '001' });
  });

  it('cherche par nom de Carte, sans tenir compte de la casse', async () => {
    const db = await catalogDatabase();

    const page = selectCatalogPage(db, filters({ search: 'jinx' }), 1).all();

    expect(codes(page)).toEqual(['SFD-001']);
  });

  it('cherche aussi par Code de version', async () => {
    const db = await catalogDatabase();

    const page = selectCatalogPage(db, filters({ search: 'sfd-00' }), 1).all();

    expect(codes(page)).toEqual(['SFD-001', 'SFD-002', 'SFD-003']);
  });

  it('cherche « % » tel quel, sans joker', async () => {
    const db = await catalogDatabase();

    expect(selectCatalogPage(db, filters({ search: '%' }), 1).all()).toEqual([]);
  });

  it('se limite aux Extensions choisies par les puces', async () => {
    const db = await catalogDatabase();

    const page = selectCatalogPage(db, filters({ expansionCodes: ['SFD'] }), 1).all();

    expect(codes(page)).toEqual(['SFD-001', 'SFD-002', 'SFD-003']);
  });

  it('montre les promos quand on le demande, après les Extensions datées', async () => {
    const db = await catalogDatabase();

    const page = selectCatalogPage(db, filters({ showPromo: true, search: 'jinx' }), 1).all();

    expect(codes(page)).toEqual(['SFD-001', 'OPP-017']);
  });

  it('donne la suite sur la page 2', async () => {
    const db = await catalogDatabase();

    const page = selectCatalogPage(db, filters(), 2).all();

    expect(codes(page)).toEqual([
      'OGN-025',
      'OGN-026',
      'OGN-027',
      'OGN-028',
      'OGN-029',
      'OGN-030',
      'SFD-001',
      'SFD-002',
      'SFD-003',
    ]);
  });
});

describe('selectCatalogCount', () => {
  it('compte toutes les Versions qui correspondent, pas seulement la page', async () => {
    const db = await catalogDatabase();

    expect(selectCatalogCount(db, filters()).get()?.count).toBe(33);
    expect(selectCatalogCount(db, filters({ showPromo: true })).get()?.count).toBe(35);
    expect(selectCatalogCount(db, filters({ search: 'jinx' })).get()?.count).toBe(1);
  });
});

describe('selectExpansionChips', () => {
  it('liste les Extensions dans l’ordre de sortie, sans les promos par défaut', async () => {
    const db = await catalogDatabase();

    expect(selectExpansionChips(db, false).all()).toEqual([
      { code: 'OGN', name: 'Origins' },
      { code: 'SFD', name: 'Spiritforged' },
    ]);
    expect(
      selectExpansionChips(db, true)
        .all()
        .map((e) => e.code),
    ).toEqual(['OGN', 'SFD', 'OPP']);
  });
});
