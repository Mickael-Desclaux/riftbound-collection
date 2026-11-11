import { fireEvent, render, screen } from '@testing-library/react-native';
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

function Opener() {
  const { zoomFrom } = usePrintingZoom();
  return (
    <Pressable accessibilityRole="button" onPress={() => zoomFrom(tile, URI)}>
      <Text>Ouvrir</Text>
    </Pressable>
  );
}

describe('PrintingZoomProvider', () => {
  it('fait voler l’image de la case touchée', async () => {
    await render(
      <SafeAreaProvider initialMetrics={PHONE}>
        <PrintingZoomProvider>
          <Opener />
        </PrintingZoomProvider>
      </SafeAreaProvider>,
    );
    expect(screen.queryByTestId('printing-zoom-image', HIDDEN)).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Ouvrir' }));

    expect(
      JSON.stringify(screen.getByTestId('printing-zoom-image', HIDDEN).props.source),
    ).toContain(URI);
  });

  it('ne fait rien sans fournisseur : la fiche s’ouvre sans animation', async () => {
    await render(<Opener />);

    await fireEvent.press(screen.getByRole('button', { name: 'Ouvrir' }));

    expect(screen.queryByTestId('printing-zoom-image', HIDDEN)).toBeNull();
  });
});
