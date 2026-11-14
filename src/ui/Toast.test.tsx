import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TOAST_DURATION_MS, ToastProvider, useToast } from './Toast';

function Trigger({ onAction }: { onAction: () => void }) {
  const show = useToast();
  return (
    <Pressable onPress={() => show({ message: 'Retirée', actionLabel: 'Annuler', onAction })}>
      <Text>Montrer</Text>
    </Pressable>
  );
}

async function setup() {
  const onAction = jest.fn();
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 360, height: 640 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <ToastProvider>
        <Trigger onAction={onAction} />
      </ToastProvider>
    </SafeAreaProvider>,
  );
  await fireEvent.press(screen.getByText('Montrer'));
  return { onAction };
}

describe('Toast', () => {
  it('lance l’action et disparaît quand on la touche', async () => {
    const { onAction } = await setup();

    await fireEvent.press(screen.getByRole('button', { name: 'Annuler' }));

    expect(onAction).toHaveBeenCalled();
    expect(screen.queryByText('Retirée')).toBeNull();
  });

  it('disparaît seul au bout de quelques secondes', async () => {
    jest.useFakeTimers();
    try {
      await setup();
      expect(screen.getByText('Retirée')).toBeTruthy();

      await act(async () => {
        jest.advanceTimersByTime(TOAST_DURATION_MS);
      });

      expect(screen.queryByText('Retirée')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});
