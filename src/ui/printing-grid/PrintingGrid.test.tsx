import { fireEvent, render, screen } from '@testing-library/react-native';

import { PrintingGrid, type GridPrinting, type PrintingGridProps } from './PrintingGrid';

const jinx: GridPrinting = {
  printingCode: 'OGN-030a',
  name: 'Jinx, Demolitionist',
  imageSmall: 'https://images.rifthunt.com/cards/small/ogn-030a.webp',
};
const ahri: GridPrinting = {
  printingCode: 'OGN-303s',
  name: 'Ahri, Nine-Tailed Fox',
  imageSmall: 'https://images.rifthunt.com/cards/small/ogn-303s.webp',
};

async function setup(props: Partial<PrintingGridProps> = {}) {
  const onPageChange = jest.fn();
  const onClearFilters = jest.fn();
  await render(
    <PrintingGrid
      items={[jinx, ahri]}
      page={1}
      pageCount={3}
      onPageChange={onPageChange}
      onClearFilters={onClearFilters}
      {...props}
    />,
  );
  return { onPageChange, onClearFilters };
}

describe('PrintingGrid', () => {
  it('affiche le nom et le Code de version de chaque Version', async () => {
    await setup();

    expect(screen.getByText('Jinx, Demolitionist')).toBeTruthy();
    expect(screen.getByText('OGN-303s')).toBeTruthy();
  });

  it('change de page depuis la pagination numérotée', async () => {
    const { onPageChange } = await setup({ page: 2, pageCount: 3 });

    await fireEvent.press(screen.getByLabelText('Page 3'));
    await fireEvent.press(screen.getByLabelText('Page précédente'));

    expect(onPageChange.mock.calls).toEqual([[3], [1]]);
  });

  it('propose d’effacer les filtres quand rien ne correspond', async () => {
    const { onClearFilters } = await setup({ items: [], pageCount: 1 });

    expect(screen.getByText('Aucune version ne correspond.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Effacer les filtres'));

    expect(onClearFilters).toHaveBeenCalled();
  });

  it('n’annonce pas un résultat vide avant la première lecture', async () => {
    await setup({ items: [], pageCount: 1, loading: true });

    expect(screen.queryByText('Aucune version ne correspond.')).toBeNull();
  });

  it('remplace une image indisponible par un cadre, et réessaie au toucher', async () => {
    await setup({ items: [jinx] });

    await fireEvent(screen.getByLabelText('Image de Jinx, Demolitionist'), 'error', {
      nativeEvent: { error: 'HTTP 404' },
    });
    expect(screen.getByText('Image indisponible · toucher pour réessayer')).toBeTruthy();

    await fireEvent.press(screen.getByText('Image indisponible · toucher pour réessayer'));
    expect(screen.getByLabelText('Image de Jinx, Demolitionist')).toBeTruthy();
  });
});
