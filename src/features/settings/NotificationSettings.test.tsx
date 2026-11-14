import { fireEvent, render, screen } from '@testing-library/react-native';

import { NotificationSettings } from './NotificationSettings';

async function setup({ blockedByAndroid = false } = {}) {
  const onNewExpansionsChange = jest.fn();
  const onOpenAndroidSettings = jest.fn();
  await render(
    <NotificationSettings
      newExpansions
      onNewExpansionsChange={onNewExpansionsChange}
      blockedByAndroid={blockedByAndroid}
      onOpenAndroidSettings={onOpenAndroidSettings}
    />,
  );
  return { onNewExpansionsChange, onOpenAndroidSettings };
}

describe('NotificationSettings', () => {
  it('coupe les annonces de nouvelles Extensions', async () => {
    const { onNewExpansionsChange } = await setup();

    await fireEvent(screen.getByLabelText('Nouvelles extensions'), 'valueChange', false);

    expect(onNewExpansionsChange).toHaveBeenCalledWith(false);
    expect(screen.queryByText(/Android bloque/)).toBeNull();
  });

  it('signale des notifications bloquées par Android, et mène à ses réglages', async () => {
    const { onOpenAndroidSettings } = await setup({ blockedByAndroid: true });

    expect(screen.getByText(/Android bloque les notifications/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Autoriser dans Android' }));

    expect(onOpenAndroidSettings).toHaveBeenCalled();
  });
});
