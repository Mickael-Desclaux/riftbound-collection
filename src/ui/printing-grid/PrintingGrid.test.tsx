import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { PrintingCode } from '@/domain/printingCode';

import { PrintingGrid, type GridPrinting, type PrintingGridProps } from './PrintingGrid';

const jinx: GridPrinting = {
  printingCode: 'OGN-030a' as PrintingCode,
  name: 'Jinx, Demolitionist',
  imageSmall: 'https://images.rifthunt.com/cards/small/ogn-030a.webp',
  imageNormal: null,
  price: 12.4,
};
const ahri: GridPrinting = {
  printingCode: 'OGN-303s' as PrintingCode,
  name: 'Ahri, Nine-Tailed Fox',
  imageSmall: 'https://images.rifthunt.com/cards/small/ogn-303s.webp',
  imageNormal: null,
  price: null,
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
      displayCurrency="CAD"
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

  it('affiche le prix de chaque Version dans la Devise d’affichage, « — » sans prix', async () => {
    await setup();

    expect(screen.getByText('12,40\u00a0$\u00a0CA')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('change de page depuis la pagination numérotée', async () => {
    const { onPageChange } = await setup({ page: 2, pageCount: 3 });

    await fireEvent.press(screen.getByLabelText('Page 3'));
    await fireEvent.press(screen.getByLabelText('Page précédente'));

    expect(onPageChange.mock.calls).toEqual([[3], [1]]);
  });

  it('rafraîchit quand on tire la grille vers le bas', async () => {
    const onRefresh = jest.fn();
    await setup({ onRefresh, refreshing: false });

    const refreshControl = screen.getByTestId('printing-grid').props.refreshControl;
    refreshControl.props.onRefresh();

    expect(onRefresh).toHaveBeenCalled();
  });

  it('propose d’effacer les filtres quand rien ne correspond', async () => {
    const { onClearFilters } = await setup({ items: [], pageCount: 1 });

    expect(screen.getByText('Aucune version ne correspond.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Effacer les filtres'));

    expect(onClearFilters).toHaveBeenCalled();
  });

  it('garde la pagination visible même s’il n’y a qu’une page', async () => {
    await setup({ pageCount: 1 });

    expect(screen.getByLabelText('Page 1')).toBeTruthy();
    expect(screen.getByLabelText('Page suivante')).toBeDisabled();
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

  it('réessaie aussi tout seul, un peu plus tard', async () => {
    jest.useFakeTimers();
    try {
      await setup({ items: [jinx] });
      await fireEvent(screen.getByLabelText('Image de Jinx, Demolitionist'), 'error', {
        nativeEvent: { error: 'HTTP 503' },
      });
      expect(screen.queryByLabelText('Image de Jinx, Demolitionist')).toBeNull();

      await act(async () => {
        jest.advanceTimersByTime(5_000);
      });

      expect(screen.getByLabelText('Image de Jinx, Demolitionist')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });
});
