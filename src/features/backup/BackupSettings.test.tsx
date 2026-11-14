import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import { createBackup, type Backup } from '@/domain/backup';
import type { PrintingCode } from '@/domain/printingCode';

import { BACKUP_READ_ERRORS, BackupSettings, type BackupActions } from './BackupSettings';

const BACKUP: Backup = createBackup(
  {
    settings: {},
    collection: [{ printingCode: 'OGN-030a' as PrintingCode, quantity: 2 }],
    wishlist: [],
    binderSelection: [],
    priceHistory: [],
  },
  '2026-11-14T10:00:00.000Z',
);

function fakeActions(overrides: Partial<BackupActions> = {}): jest.Mocked<BackupActions> {
  return {
    exportBackup: jest.fn().mockResolvedValue(undefined),
    pickBackup: jest.fn().mockResolvedValue({ ok: true, backup: BACKUP }),
    restore: jest.fn().mockResolvedValue(undefined),
    undoLastRestore: jest.fn().mockResolvedValue(undefined),
    canUndoLastRestore: jest.fn().mockResolvedValue(false),
    ...overrides,
  } as jest.Mocked<BackupActions>;
}

/** Répond à la prochaine boîte de confirmation en touchant le bouton `label`. */
function answerConfirmation(label: string) {
  return jest.spyOn(Alert, 'alert').mockImplementationOnce((_title, _message, buttons) => {
    (buttons as AlertButton[]).find((button) => button.text === label)?.onPress?.();
  });
}

afterEach(() => jest.restoreAllMocks());

describe('BackupSettings', () => {
  it('ne restaure rien et explique pourquoi quand le fichier n’est pas une Sauvegarde', async () => {
    const actions = fakeActions({
      pickBackup: jest.fn().mockResolvedValue({
        ok: false,
        error: { kind: 'not-a-backup', details: 'JSON illisible' },
      }),
    });
    const alert = jest.spyOn(Alert, 'alert');
    await render(<BackupSettings actions={actions} />);

    await fireEvent.press(screen.getByText('Restaurer une sauvegarde'));

    expect(await screen.findByText(BACKUP_READ_ERRORS['not-a-backup'])).toBeOnTheScreen();
    expect(alert).not.toHaveBeenCalled();
    expect(actions.restore).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText('Détails'));
    expect(screen.getByText('JSON illisible')).toBeOnTheScreen();
  });

  it('demande confirmation, restaure, puis propose d’annuler la restauration', async () => {
    const actions = fakeActions();
    const alert = answerConfirmation('Restaurer');
    await render(<BackupSettings actions={actions} />);
    expect(screen.queryByText('Annuler la dernière restauration')).not.toBeOnTheScreen();

    actions.canUndoLastRestore.mockResolvedValue(true);
    await fireEvent.press(screen.getByText('Restaurer une sauvegarde'));

    expect(alert).toHaveBeenCalledWith(
      'Restaurer cette sauvegarde ?',
      expect.stringContaining('1 version dans la Collection, 0 souhait'),
      expect.any(Array),
      expect.any(Object),
    );
    expect(actions.restore).toHaveBeenCalledWith(BACKUP);
    expect(await screen.findByText('Annuler la dernière restauration')).toBeOnTheScreen();
  });

  it('ne restaure rien si l’utilisateur revient en arrière', async () => {
    const actions = fakeActions();
    answerConfirmation('Retour');
    await render(<BackupSettings actions={actions} />);

    await fireEvent.press(screen.getByText('Restaurer une sauvegarde'));

    expect(actions.restore).not.toHaveBeenCalled();
  });
});
