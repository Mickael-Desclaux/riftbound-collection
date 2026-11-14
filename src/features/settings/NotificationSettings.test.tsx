import { fireEvent, render, screen } from '@testing-library/react-native';

import { NotificationSettings } from './NotificationSettings';

async function setup({ blockedByAndroid = false, priceAlerts = true } = {}) {
  const onNewExpansionsChange = jest.fn();
  const onPriceAlertsChange = jest.fn();
  const onPriceAlertThresholdChange = jest.fn();
  const onOpenAndroidSettings = jest.fn();
  await render(
    <NotificationSettings
      newExpansions
      onNewExpansionsChange={onNewExpansionsChange}
      priceAlerts={priceAlerts}
      onPriceAlertsChange={onPriceAlertsChange}
      priceAlertThreshold={15}
      onPriceAlertThresholdChange={onPriceAlertThresholdChange}
      blockedByAndroid={blockedByAndroid}
      onOpenAndroidSettings={onOpenAndroidSettings}
    />,
  );
  return {
    onNewExpansionsChange,
    onPriceAlertsChange,
    onPriceAlertThresholdChange,
    onOpenAndroidSettings,
  };
}

const THRESHOLD = 'Seuil des alertes de prix, en %';

describe('NotificationSettings', () => {
  it('coupe les annonces de nouvelles Extensions', async () => {
    const { onNewExpansionsChange } = await setup();

    await fireEvent(screen.getByLabelText('Nouvelles extensions'), 'valueChange', false);

    expect(onNewExpansionsChange).toHaveBeenCalledWith(false);
    expect(screen.queryByText(/Android bloque/)).toBeNull();
  });

  it('coupe les Alertes de prix, et masque alors leur seuil', async () => {
    const { onPriceAlertsChange } = await setup();

    expect(screen.getByLabelText(THRESHOLD).props.value).toBe('15');
    await fireEvent(screen.getByLabelText('Alertes de prix des souhaits'), 'valueChange', false);
    expect(onPriceAlertsChange).toHaveBeenCalledWith(false);

    await setup({ priceAlerts: false });
    expect(screen.queryByLabelText(THRESHOLD)).toBeNull();
  });

  it('enregistre un nouveau seuil à la fin de la saisie', async () => {
    const { onPriceAlertThresholdChange } = await setup();
    const input = screen.getByLabelText(THRESHOLD);

    await fireEvent.changeText(input, '12,5');
    await fireEvent(input, 'endEditing');

    expect(onPriceAlertThresholdChange).toHaveBeenCalledWith(12.5);
  });

  it('reprend le seuil enregistré après une saisie invalide', async () => {
    const { onPriceAlertThresholdChange } = await setup();
    const input = screen.getByLabelText(THRESHOLD);

    await fireEvent.changeText(input, '0');
    await fireEvent(input, 'endEditing');

    expect(onPriceAlertThresholdChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText(THRESHOLD).props.value).toBe('15');
  });

  it('signale des notifications bloquées par Android, et mène à ses réglages', async () => {
    const { onOpenAndroidSettings } = await setup({ blockedByAndroid: true });

    expect(screen.getByText(/Android bloque les notifications/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Autoriser dans Android' }));

    expect(onOpenAndroidSettings).toHaveBeenCalled();
  });
});
