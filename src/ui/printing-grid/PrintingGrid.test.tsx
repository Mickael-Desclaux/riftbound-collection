import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { PrintingCode } from '@/domain/printingCode';

import { PrintingGrid, type GridPrinting, type PrintingGridProps } from './PrintingGrid';

const jinx: GridPrinting = {
  printingCode: 'OGN-030a' as PrintingCode,
  name: 'Jinx, Demolitionist',
  imageSmall: 'https://images.rifthunt.com/cards/small/ogn-030a.webp',
  imageNormal: null,
  price: 12.4,
  ownedQuantity: 3,
  inCatalog: true,
  wishlistedAt: null,
  wishlistPriceChange: null,
};
const ahri: GridPrinting = {
  printingCode: 'OGN-303s' as PrintingCode,
  name: 'Ahri, Nine-Tailed Fox',
  imageSmall: 'https://images.rifthunt.com/cards/small/ogn-303s.webp',
  imageNormal: null,
  price: null,
  ownedQuantity: 0,
  inCatalog: true,
  wishlistedAt: '2026-11-01T09:00:00.000Z',
  wishlistPriceChange: -12.5,
};

async function setup(props: Partial<PrintingGridProps> = {}) {
  const onPageChange = jest.fn();
  const onClearFilters = jest.fn();
  const onOpenPrinting = jest.fn();
  const onToggleOwned = jest.fn();
  const onToggleWishlisted = jest.fn();
  await render(
    <PrintingGrid
      items={[jinx, ahri]}
      page={1}
      pageCount={3}
      onPageChange={onPageChange}
      onClearFilters={onClearFilters}
      displayCurrency="CAD"
      onOpenPrinting={onOpenPrinting}
      onToggleOwned={onToggleOwned}
      onToggleWishlisted={onToggleWishlisted}
      {...props}
    />,
  );
  return { onPageChange, onClearFilters, onOpenPrinting, onToggleOwned, onToggleWishlisted };
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

  it('ouvre la fiche de la Version touchée', async () => {
    const { onOpenPrinting } = await setup();

    await fireEvent.press(screen.getByRole('button', { name: /^Jinx, Demolitionist, OGN-030a/ }));

    expect(onOpenPrinting).toHaveBeenCalledWith('OGN-030a');
  });

  it('affiche « ×n » sur les Versions possédées', async () => {
    await setup();

    expect(screen.getByText('×3')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Possédée : Jinx, Demolitionist' })).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Possédée : Ahri, Nine-Tailed Fox' }),
    ).not.toBeChecked();
  });

  it('bascule la possession avec ✓, sans ouvrir la fiche', async () => {
    const { onToggleOwned, onOpenPrinting } = await setup();

    await fireEvent.press(
      screen.getByRole('checkbox', { name: 'Possédée : Ahri, Nine-Tailed Fox' }),
    );

    expect(onToggleOwned).toHaveBeenCalledWith(ahri);
    expect(onOpenPrinting).not.toHaveBeenCalled();
  });

  it('ajoute aux souhaits ou en retire avec ♡, sans ouvrir la fiche', async () => {
    const { onToggleWishlisted, onOpenPrinting } = await setup();

    expect(
      screen.getByRole('checkbox', { name: 'En souhait : Jinx, Demolitionist' }),
    ).not.toBeChecked();
    await fireEvent.press(
      screen.getByRole('checkbox', { name: 'En souhait : Ahri, Nine-Tailed Fox' }),
    );

    expect(onToggleWishlisted).toHaveBeenCalledWith(ahri);
    expect(onOpenPrinting).not.toHaveBeenCalled();
  });

  it('montre la variation depuis l’ajout dans l’onglet Souhaits seulement', async () => {
    await setup();
    expect(screen.queryByText(/depuis l’ajout/)).toBeNull();

    await setup({ showWishlistChange: true });
    expect(screen.getByText('−12,5 % depuis l’ajout')).toBeTruthy();
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
