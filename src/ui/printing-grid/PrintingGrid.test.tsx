import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { PrintingCode } from '@/domain/printingCode';

import { PrintingGrid, type GridPrinting, type PrintingGridProps } from './PrintingGrid';

const jinx: GridPrinting = {
  printingCode: 'OGN-030a' as PrintingCode,
  name: 'Jinx, Demolitionist',
  imageSmall: 'https://images.rifthunt.com/cards/small/ogn-030a.webp',
  imageNormal: null,
};
const ahri: GridPrinting = {
  printingCode: 'OGN-303s' as PrintingCode,
  name: 'Ahri, Nine-Tailed Fox',
  imageSmall: 'https://images.rifthunt.com/cards/small/ogn-303s.webp',
  imageNormal: null,
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
