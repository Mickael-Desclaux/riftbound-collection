import { fireEvent, render, screen } from '@testing-library/react-native';

import type { PrintingDetail, PrintingState } from '@/data/printingDetail';
import type { ExchangeRate } from '@/domain/exchangeRates';
import type { PrintingCode } from '@/domain/printingCode';

import { PrintingDetailView } from './PrintingDetailView';

const NBSP = ' ';

const detail: PrintingDetail = {
  printingCode: 'OGN-030a' as PrintingCode,
  name: 'Jinx, Demolitionist',
  expansionCode: 'OGN',
  expansionName: 'Origins',
  collectorNumber: '030a',
  rarity: 'epic',
  variant: 'alternate',
  finishes: ['foil'],
  type: 'Unit',
  domains: ['fury'],
  artist: 'Envar Studio',
  imageSmall: null,
  imageNormal: null,
  imageLarge: null,
  tcgId: 652803,
  cardmarketProductId: 847147,
  prices: {
    tcgplayer: { foil: { value: 2.95, currency: 'USD', publishedAt: '2026-11-10T17:00:00.000Z' } },
    cardmarket: { foil: { value: 3.52, currency: 'EUR', publishedAt: '2026-11-11T01:45:56.000Z' } },
  },
  otherPrintings: [
    {
      printingCode: 'OGN-030' as PrintingCode,
      name: 'Jinx, Demolitionist',
      imageSmall: null,
      imageNormal: null,
    },
  ],
};

const rates: ExchangeRate[] = [
  {
    date: '2026-11-10',
    baseCurrency: 'USD',
    quoteCurrency: 'EUR',
    rate: 0.89174,
    source: 'frankfurter',
  },
];

async function setup(state: Partial<PrintingState> = {}) {
  const handlers = {
    onBack: jest.fn(),
    onOpenPrinting: jest.fn(),
    onOpenUrl: jest.fn(),
    onQuantityChange: jest.fn(),
    onWishlistChange: jest.fn(),
    onBinderSelectionChange: jest.fn(),
  };
  await render(
    <PrintingDetailView
      detail={detail}
      state={{ quantity: 0, wishlistedAt: null, inBinderSelection: false, ...state }}
      displayCurrency="EUR"
      priceSource="tcgplayer"
      rates={rates}
      {...handlers}
    />,
  );
  return handlers;
}

describe('PrintingDetailView', () => {
  it('affiche la Version et le prix de la Source des Réglages', async () => {
    await setup();

    expect(screen.getByRole('header', { name: 'Jinx, Demolitionist' })).toBeTruthy();
    expect(screen.getByText(/OGN-030a · Épique · Alternative/)).toBeTruthy();
    // 2,95 $ US × 0,89174 = 2,63 €
    expect(screen.getByLabelText('Prix affiché')).toHaveTextContent(`2,63${NBSP}€`);
  });

  it('toucher une case change le gros prix de cette fiche', async () => {
    await setup();

    await fireEvent.press(screen.getByRole('button', { name: /Cardmarket Foil/ }));

    expect(screen.getByLabelText('Prix affiché')).toHaveTextContent(`3,52${NBSP}€`);
    expect(screen.getByText(/toutes langues et tous états confondus/)).toBeTruthy();
  });

  it('ouvre la page produit de la Source affichée', async () => {
    const { onOpenUrl } = await setup();

    await fireEvent.press(screen.getByRole('button', { name: /Cardmarket Foil/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Ouvrir sur Cardmarket' }));

    expect(onOpenUrl).toHaveBeenCalledWith(
      'https://www.cardmarket.com/en/Riftbound/Products?idProduct=847147',
    );
  });

  it('règle la quantité, sans descendre sous 0', async () => {
    const { onQuantityChange } = await setup({ quantity: 2 });

    await fireEvent.press(screen.getByRole('button', { name: 'Ajouter un exemplaire' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Retirer un exemplaire' }));

    expect(onQuantityChange.mock.calls).toEqual([[3], [1]]);
  });

  it('bascule le souhait et la Sélection du classeur', async () => {
    const { onWishlistChange, onBinderSelectionChange } = await setup({ inBinderSelection: true });

    await fireEvent.press(screen.getByRole('button', { name: 'Ajouter aux souhaits' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Dans le classeur' }));

    expect(onWishlistChange).toHaveBeenCalledWith(true);
    expect(onBinderSelectionChange).toHaveBeenCalledWith(false);
  });

  it('ouvre une autre version de la même Carte', async () => {
    const { onOpenPrinting } = await setup();

    await fireEvent.press(screen.getByRole('button', { name: /OGN-030,/ }));

    expect(onOpenPrinting).toHaveBeenCalledWith('OGN-030');
  });
});
