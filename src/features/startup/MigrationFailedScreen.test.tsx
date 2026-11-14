import { fireEvent, render, screen } from '@testing-library/react-native';

import { MigrationFailedScreen, type MigrationFailedScreenProps } from './MigrationFailedScreen';

function props(overrides: Partial<MigrationFailedScreenProps> = {}): MigrationFailedScreenProps {
  return {
    step: 'migration',
    details: 'no such table: missing',
    hasSafetyBackup: true,
    exportSafetyBackup: jest.fn().mockResolvedValue(undefined),
    retry: jest.fn(),
    ...overrides,
  };
}

describe('MigrationFailedScreen', () => {
  it('propose d’exporter la Sauvegarde de sécurité', async () => {
    const exportSafetyBackup = jest.fn().mockResolvedValue(undefined);
    await render(<MigrationFailedScreen {...props({ exportSafetyBackup })} />);

    expect(screen.getByText(/Tes données n’ont pas été modifiées/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Exporter la sauvegarde de sécurité'));

    expect(exportSafetyBackup).toHaveBeenCalled();
  });

  it('prévient si l’export échoue', async () => {
    await render(
      <MigrationFailedScreen
        {...props({ exportSafetyBackup: jest.fn().mockRejectedValue(new Error('partage')) })}
      />,
    );

    await fireEvent.press(screen.getByText('Exporter la sauvegarde de sécurité'));

    expect(await screen.findByText(/n’a pas pu être exportée/)).toBeTruthy();
  });

  it('sans Sauvegarde de sécurité, propose seulement de réessayer', async () => {
    const retry = jest.fn();
    await render(
      <MigrationFailedScreen
        {...props({ step: 'safety-backup', hasSafetyBackup: false, retry })}
      />,
    );

    expect(screen.queryByText('Exporter la sauvegarde de sécurité')).toBeNull();
    await fireEvent.press(screen.getByText('Réessayer'));
    expect(retry).toHaveBeenCalled();
  });
});
