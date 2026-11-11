import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PrintingZoomProvider, usePrintingZoom } from './PrintingZoom';

const URI = 'https://images.rifthunt.com/cards/normal/ogn-030a.webp';

/** Une case qui se mesure à (16, 200), 160 × 223 dans la fenêtre. */
const tile = {
  measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) =>
    callback(16, 200, 160, 223),
};

/** L'image volante est décorative : masquée à l'accessibilité. */
const HIDDEN = { includeHiddenElements: true };

const PHONE = {
  frame: { x: 0, y: 0, width: 392, height: 852 },
  insets: { top: 24, left: 0, right: 0, bottom: 0 },
};

function Opener({ onOpen = jest.fn() }: { onOpen?: () => void }) {
  const { zoomFrom } = usePrintingZoom();
  return (
    <Pressable accessibilityRole="button" onPress={() => zoomFrom(tile, URI, onOpen)}>
      <Text>Ouvrir</Text>
    </Pressable>
  );
}

describe('PrintingZoomProvider', () => {
  it('fait voler l’image de la case touchée, puis ouvre la fiche', async () => {
    const onOpen = jest.fn();
    await render(
      <SafeAreaProvider initialMetrics={PHONE}>
        <PrintingZoomProvider>
          <Opener onOpen={onOpen} />
        </PrintingZoomProvider>
      </SafeAreaProvider>,
    );
    expect(screen.queryByTestId('printing-zoom-image', HIDDEN)).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Ouvrir' }));

    expect(
      JSON.stringify(screen.getByTestId('printing-zoom-image', HIDDEN).props.source),
    ).toContain(URI);
    // La fiche s'ouvre une image plus tard, une fois l'image partie.
    await waitFor(() => expect(onOpen).toHaveBeenCalled());
  });

  it('sans fournisseur, ouvre la fiche tout de suite, sans animation', async () => {
    const onOpen = jest.fn();
    await render(<Opener onOpen={onOpen} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Ouvrir' }));

    expect(onOpen).toHaveBeenCalled();
    expect(screen.queryByTestId('printing-zoom-image', HIDDEN)).toBeNull();
  });
});
