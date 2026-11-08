import { fireEvent, render, screen } from '@testing-library/react-native';

import { DEFAULT_CATALOG_FILTERS, type CatalogFilters } from '@/domain/catalogFilters';

import { ActiveFilterChips } from './ActiveFilterChips';
import { FilterSheet, type FilterOptions } from './FilterSheet';

const options: FilterOptions = {
  expansions: [
    { code: 'OGN', name: 'Origins' },
    { code: 'SFD', name: 'Spiritforged' },
  ],
  promoExpansions: [{ code: 'OPP', name: 'Organized Play' }],
  rarities: ['common', 'epic'],
  types: ['Unit', 'Spell'],
  domains: ['fury', 'mind'],
};

async function setup(filters: Partial<CatalogFilters> = {}) {
  const onChange = jest.fn();
  const onClose = jest.fn();
  await render(
    <FilterSheet
      visible
      filters={{ ...DEFAULT_CATALOG_FILTERS, ...filters }}
      options={options}
      resultCount={12}
      onChange={onChange}
      onClose={onClose}
    />,
  );
  return { onChange, onClose };
}

describe('FilterSheet', () => {
  it('ajoute une valeur au critère touché', async () => {
    const { onChange } = await setup({ rarities: ['common'] });

    await fireEvent.press(screen.getByText('Épique'));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ rarities: ['common', 'epic'] }),
    );
  });

  it('retire une valeur déjà choisie', async () => {
    const { onChange } = await setup({ domains: ['mind'] });

    await fireEvent.press(screen.getByText('Esprit'));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ domains: [] }));
  });

  it('ne montre les Extensions promo qu’une fois l’option cochée', async () => {
    await setup();
    expect(screen.queryByText('Organized Play')).toBeNull();

    await setup({ showPromo: true });
    expect(screen.getByText('Organized Play')).toBeTruthy();
  });

  it('réinitialise les filtres, sans toucher à la recherche', async () => {
    const { onChange } = await setup({ search: 'jinx', rarities: ['epic'], ownership: 'owned' });

    await fireEvent.press(screen.getByText('Réinitialiser'));

    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_CATALOG_FILTERS, search: 'jinx' });
  });

  it('range les raretés dans l’ordre du jeu, les inconnues à la fin', async () => {
    const onChange = jest.fn();
    await render(
      <FilterSheet
        visible
        filters={DEFAULT_CATALOG_FILTERS}
        options={{
          ...options,
          rarities: ['showcase', 'common', 'mythic', 'rare', 'epic', 'uncommon'],
        }}
        resultCount={1}
        onChange={onChange}
        onClose={jest.fn()}
      />,
    );

    const labels = ['Commune', 'Peu commune', 'Rare', 'Épique', 'Showcase', 'mythic'];
    expect(
      screen
        .getAllByText(/^(Commune|Peu commune|Rare|Épique|Showcase|mythic)$/)
        .map((node) => node.props.children)
        // La section Version a aussi une puce « Showcase », plus bas.
        .slice(0, labels.length),
    ).toEqual(labels);
  });

  it('annonce le nombre de résultats et ferme la feuille', async () => {
    const { onClose } = await setup();

    await fireEvent.press(screen.getByText('Voir 12 versions'));

    expect(onClose).toHaveBeenCalled();
  });
});

describe('ActiveFilterChips', () => {
  it('montre chaque filtre actif et le retire d’un toucher', async () => {
    const onChange = jest.fn();
    const filters = {
      ...DEFAULT_CATALOG_FILTERS,
      expansionCodes: ['SFD'],
      variants: ['metal' as const],
    };
    await render(<ActiveFilterChips filters={filters} options={options} onChange={onChange} />);

    expect(screen.getByLabelText('Retirer le filtre Spiritforged')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Retirer le filtre Metal'));

    expect(onChange).toHaveBeenCalledWith({ ...filters, variants: [] });
  });
});
