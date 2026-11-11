import { fireEvent, render, screen } from '@testing-library/react-native';

import { PriceSettings } from './PriceSettings';

async function setup() {
  const onDisplayCurrencyChange = jest.fn();
  const onPriceSourceChange = jest.fn();
  await render(
    <PriceSettings
      displayCurrency="CAD"
      priceSource="tcgplayer"
      onDisplayCurrencyChange={onDisplayCurrencyChange}
      onPriceSourceChange={onPriceSourceChange}
    />,
  );
  return { onDisplayCurrencyChange, onPriceSourceChange };
}

describe('PriceSettings', () => {
  it('montre la Devise d’affichage et la Source de prix choisies', async () => {
    await setup();

    expect(screen.getByRole('button', { name: 'CAD' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'TCGplayer' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'EUR' })).not.toBeSelected();
  });

  it('change la Devise d’affichage', async () => {
    const { onDisplayCurrencyChange } = await setup();

    await fireEvent.press(screen.getByRole('button', { name: 'EUR' }));

    expect(onDisplayCurrencyChange).toHaveBeenCalledWith('EUR');
  });

  it('change la Source de prix, avec la mention propre à Cardmarket', async () => {
    const { onPriceSourceChange } = await setup();

    await fireEvent.press(screen.getByRole('button', { name: 'Cardmarket' }));

    expect(onPriceSourceChange).toHaveBeenCalledWith('cardmarket');
    expect(screen.getByText(/toutes langues et tous états/)).toBeTruthy();
  });
});
