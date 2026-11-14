import { serializeSyncs } from './syncQueue';
import { EMPTY_SYNC_REPORT, type SyncMode, type SyncReport } from './syncAll';

/** Une synchronisation que le test termine quand il veut. */
function controllableSync() {
  const started: SyncMode[] = [];
  const pending: (() => void)[] = [];
  const sync = (mode: SyncMode) =>
    new Promise<SyncReport>((resolve) => {
      started.push(mode);
      pending.push(() => resolve({ ...EMPTY_SYNC_REPORT, failures: [] }));
    });
  const finishCurrent = async () => {
    pending.shift()?.();
    // Laisse les suites des promesses s'exécuter.
    await new Promise((resolve) => setImmediate(resolve));
  };
  return { sync, started, finishCurrent };
}

describe('serializeSyncs', () => {
  it('une vérification ordinaire rejoint la synchronisation en cours', async () => {
    const { sync, started, finishCurrent } = controllableSync();
    const synchronize = serializeSyncs(sync);

    const first = synchronize('auto');
    const joined = synchronize('auto');
    await finishCurrent();

    expect(started).toEqual(['auto']);
    expect(await joined).toBe(await first);
  });

  it('une mise à jour demandée pendant une synchronisation est lancée après elle', async () => {
    const { sync, started, finishCurrent } = controllableSync();
    const synchronize = serializeSyncs(sync);

    void synchronize('auto');
    const refresh = synchronize('refresh');
    expect(started).toEqual(['auto']);
    await finishCurrent();
    expect(started).toEqual(['auto', 'refresh']);
    await finishCurrent();

    await expect(refresh).resolves.toEqual(EMPTY_SYNC_REPORT);
  });

  it('relance après une synchronisation qui a échoué', async () => {
    let calls = 0;
    const synchronize = serializeSyncs(() => {
      calls += 1;
      return calls === 1 ? Promise.reject(new Error('panne')) : Promise.resolve(EMPTY_SYNC_REPORT);
    });

    await expect(synchronize('auto')).rejects.toThrow('panne');
    await expect(synchronize('auto')).resolves.toEqual(EMPTY_SYNC_REPORT);
  });
});
