import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import type { SourceState } from '@/data/sourceState';
import { SourceError } from '@/sources/http';

import { SourceSettings } from './SourceSettings';

const state = (overrides: Partial<SourceState> & Pick<SourceState, 'source'>): SourceState => ({
  lastSuccessAt: null,
  lastErrorAt: null,
  lastErrorMessage: null,
  lastErrorDetails: null,
  lastModified: null,
  ...overrides,
});

afterEach(() => jest.restoreAllMocks());

describe('SourceSettings', () => {
  it('montre l’état de chaque source, et le diagnostic d’une erreur sur demande', async () => {
    await render(
      <SourceSettings
        states={[
          state({ source: 'rifthunt-catalog', lastSuccessAt: '2026-11-14T10:00:00Z' }),
          state({
            source: 'cardmarket-prices',
            lastSuccessAt: '2026-11-13T10:00:00Z',
            lastErrorAt: '2026-11-14T10:00:00Z',
            lastErrorMessage: 'Format inattendu dans le price guide Cardmarket.',
            lastErrorDetails: 'priceGuides.0.avg: Expected number',
          }),
        ]}
        resynchronize={jest.fn()}
      />,
    );

    expect(screen.getAllByText('À jour')).toHaveLength(1);
    expect(screen.getAllByText('En échec')).toHaveLength(1);
    expect(screen.getAllByText('Jamais contactée')).toHaveLength(4);
    expect(screen.getByText(/Format inattendu dans le price guide Cardmarket/)).toBeTruthy();
    expect(screen.queryByText(/Expected number/)).toBeNull();
    await fireEvent.press(screen.getByText('Détails'));
    expect(screen.getByText(/Expected number/)).toBeTruthy();
  });

  it('« Tout resynchroniser » dit ce qui n’a pas pu être mis à jour', async () => {
    const resynchronize = jest.fn().mockResolvedValue({
      failures: [{ step: 'exchangeRates', error: new SourceError('network', 'Hors ligne.') }],
    });
    await render(<SourceSettings states={[]} resynchronize={resynchronize} />);

    await fireEvent.press(screen.getByText('Tout resynchroniser'));

    expect(resynchronize).toHaveBeenCalledWith('resync');
    expect(await screen.findByText(/Pas de mise à jour pour les taux de change/)).toBeTruthy();
  });

  it('« Reconstruire le catalogue » demande confirmation', async () => {
    const resynchronize = jest.fn().mockResolvedValue({ failures: [] });
    jest.spyOn(Alert, 'alert').mockImplementationOnce((_title, _message, buttons) => {
      (buttons as AlertButton[]).find((button) => button.text === 'Reconstruire')?.onPress?.();
    });
    await render(<SourceSettings states={[]} resynchronize={resynchronize} />);

    await fireEvent.press(screen.getByText('Reconstruire le catalogue'));

    expect(resynchronize).toHaveBeenCalledWith('rebuild');
    expect(await screen.findByText('Tout est à jour.')).toBeTruthy();
  });
});
