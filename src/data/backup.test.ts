import { createBackup, readBackup, serializeBackup, type PreciousData } from '@/domain/backup';
import type { PrintingCode } from '@/domain/printingCode';

import {
  exportBackup,
  readPreciousData,
  replacePreciousData,
  restoreBackup,
  undoLastRestore,
} from './backup';
import { replaceCatalog } from './catalog';
import { setOwnedQuantity } from './collection';
import type { AppDatabase } from './database';
import { savePrices } from './prices';
import { setInBinderSelection } from './printingDetail';
import { printing } from './schema';
import { setSetting } from './settings';
import { catalogOf, expansionOf, printingOf } from './testing/catalogFactory';
import { createTestDatabase } from './testing/createTestDatabase';
import { memorySafetyBackups } from './testing/memorySafetyBackups';
import { setWishlisted } from './wishlist';

/** Entrée dans la Collection, pour les tests. */
const ENTERED = new Date('2026-11-01T10:00:00.000Z');

const JINX = 'OGN-030a' as PrintingCode;
const GHOST = 'OGN-999' as PrintingCode;
const NOW = new Date('2026-11-14T10:00:00.000Z');
const NOW_ISO = NOW.toISOString();

/** Une base avec des Données précieuses de chaque sorte, dont une Version inconnue. */
async function filledDatabase(): Promise<AppDatabase> {
  const { db } = await createTestDatabase();
  replaceCatalog(
    db,
    catalogOf([expansionOf('OGN', { name: 'Origins' })], [printingOf('OGN', '030a', 'Jinx')]),
  );
  setSetting(db, 'displayCurrency', 'EUR');
  setSetting(db, 'chartPeriod', { from: '2026-10-01', to: '2026-11-01' });
  setOwnedQuantity(db, JINX, 3, ENTERED);
  setOwnedQuantity(db, GHOST, 1, ENTERED);
  setWishlisted(db, GHOST, '2026-11-02T09:00:00.000Z');
  setInBinderSelection(db, JINX, true);
  const record = (recordedAt: string, value: number) => ({
    printingCode: JINX,
    source: 'tcgplayer' as const,
    finish: 'normal' as const,
    recordedAt,
    value,
  });
  savePrices(
    db,
    'tcgplayer',
    [],
    [record('2026-11-01T00:00:00.000Z', 1.5), record('2026-11-03T00:00:00.000Z', 1.75)],
  );
  return db;
}

const OTHER_DATA: PreciousData = {
  settings: { priceSource: 'cardmarket' },
  collection: [
    {
      printingCode: 'SFD-001' as PrintingCode,
      quantity: 1,
      addedAt: '2026-11-05T08:00:00.000Z',
      lastAlertPrice: 2,
      lastAlertSource: 'cardmarket',
      lastAlertAt: '2026-11-08T08:00:00.000Z',
    },
  ],
  wishlist: [],
  binderSelection: [],
  priceHistory: [],
};

describe('Sauvegarde', () => {
  it('fait l’aller-retour export → import sur un autre appareil sans rien perdre', async () => {
    const source = await filledDatabase();
    const text = serializeBackup(exportBackup(source, NOW));

    const { db: target } = await createTestDatabase();
    const result = readBackup(text);
    if (!result.ok) throw new Error(result.error.details);
    replacePreciousData(target, result.backup);

    expect(readPreciousData(target, NOW_ISO)).toEqual(readPreciousData(source, NOW_ISO));
    expect(readPreciousData(target, NOW_ISO)).toMatchObject({
      settings: { displayCurrency: 'EUR', chartPeriod: { from: '2026-10-01', to: '2026-11-01' } },
      collection: [
        { printingCode: JINX, quantity: 3 },
        { printingCode: GHOST, quantity: 1 },
      ],
      wishlist: [{ printingCode: GHOST, addedAt: '2026-11-02T09:00:00.000Z' }],
      binderSelection: [JINX],
      priceHistory: [{ printingCode: JINX, points: [expect.any(Array), expect.any(Array)] }],
    });
  });

  it('ne garde rien des anciennes Données précieuses et ne touche pas au Catalogue', async () => {
    const db = await filledDatabase();

    replacePreciousData(db, OTHER_DATA);

    expect(readPreciousData(db, NOW_ISO)).toEqual(OTHER_DATA);
    expect(db.select().from(printing).all()).toHaveLength(1);
  });

  it('ne modifie rien si le remplacement échoue en cours de route', async () => {
    const db = await filledDatabase();
    const before = readPreciousData(db, NOW_ISO);
    // Une quantité nulle viole la contrainte de la table, après l'insertion des réglages.
    const invalid = {
      ...OTHER_DATA,
      collection: OTHER_DATA.collection.map((entry) => ({ ...entry, quantity: 0 })),
    };

    expect(() => replacePreciousData(db, invalid)).toThrow();
    expect(readPreciousData(db, NOW_ISO)).toEqual(before);
  });

  it('range les données actuelles dans une Sauvegarde de sécurité avant de restaurer, et sait annuler', async () => {
    const db = await filledDatabase();
    const before = readPreciousData(db, NOW_ISO);
    const { store, files } = memorySafetyBackups();

    await restoreBackup(db, createBackup(OTHER_DATA, NOW.toISOString()), {
      safetyBackups: store,
      now: () => NOW,
    });

    expect(readPreciousData(db, NOW_ISO)).toEqual(OTHER_DATA);
    expect(readBackup(files.get('restore') ?? '')).toMatchObject({
      ok: true,
      backup: { exportedAt: NOW.toISOString(), ...before },
    });

    await undoLastRestore(db, store);

    expect(readPreciousData(db, NOW_ISO)).toEqual(before);
    expect(files.has('restore')).toBe(false);
  });

  it('ne restaure rien si la Sauvegarde de sécurité ne peut pas être écrite', async () => {
    const db = await filledDatabase();
    const before = readPreciousData(db, NOW_ISO);
    const { store } = memorySafetyBackups({ failWrites: true });

    await expect(
      restoreBackup(db, createBackup(OTHER_DATA, NOW.toISOString()), {
        safetyBackups: store,
        now: () => NOW,
      }),
    ).rejects.toThrow('disque plein');
    expect(readPreciousData(db, NOW_ISO)).toEqual(before);
  });

  it('garde la restauration précédente annulable si le remplacement échoue', async () => {
    const db = await filledDatabase();
    const { store, files } = memorySafetyBackups();
    files.set('restore', 'restauration précédente');
    const invalid = {
      ...OTHER_DATA,
      collection: OTHER_DATA.collection.map((entry) => ({ ...entry, quantity: 0 })),
    };

    await expect(
      restoreBackup(db, createBackup(invalid, NOW.toISOString()), {
        safetyBackups: store,
        now: () => NOW,
      }),
    ).rejects.toThrow();
    expect(files.get('restore')).toBe('restauration précédente');
  });

  it('refuse d’annuler quand il n’y a pas eu de restauration', async () => {
    const db = await filledDatabase();
    const before = readPreciousData(db, NOW_ISO);

    await expect(undoLastRestore(db, memorySafetyBackups().store)).rejects.toThrow(
      'Aucune restauration à annuler.',
    );
    expect(readPreciousData(db, NOW_ISO)).toEqual(before);
  });
});
