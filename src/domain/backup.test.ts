import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  createBackup,
  fromPriceSeries,
  readBackup,
  serializeBackup,
  toPriceSeries,
  upgradeBackupDocument,
  type PreciousData,
} from './backup';
import type { PriceRecord } from './priceRecords';
import type { PrintingCode } from './printingCode';

const code = (value: string) => value as PrintingCode;

const EXPORTED_AT = '2026-11-14T10:00:00.000Z';
const READ_AT = '2026-12-01T09:00:00.000Z';

/** Une ligne de la Collection telle que l'écrit le format 2. */
function owned(printingCode: string, quantity: number, overrides: Record<string, unknown> = {}) {
  return {
    printingCode,
    quantity,
    addedAt: '2026-11-02T08:00:00.000Z',
    lastAlertPrice: null,
    lastAlertSource: null,
    lastAlertAt: null,
    ...overrides,
  };
}

function preciousData(overrides: Partial<PreciousData> = {}): PreciousData {
  return {
    settings: { displayCurrency: 'EUR', priceAlertThreshold: 20 },
    collection: [
      {
        printingCode: code('OGN-030a'),
        quantity: 2,
        addedAt: '2026-11-02T08:00:00.000Z',
        lastAlertPrice: 4.1,
        lastAlertSource: 'cardmarket',
        lastAlertAt: '2026-11-09T08:00:00.000Z',
      },
    ],
    wishlist: [
      {
        printingCode: code('OGN-303s'),
        addedAt: '2026-11-01T08:00:00.000Z',
        lastAlertPrice: 12.5,
        lastAlertSource: 'tcgplayer',
        lastAlertAt: '2026-11-10T08:00:00.000Z',
      },
    ],
    binderSelection: [code('OGN-030a'), code('SFD-001')],
    priceHistory: [
      {
        printingCode: code('OGN-030a'),
        source: 'cardmarket',
        finish: 'foil',
        points: [
          ['2026-11-01T02:00:00.000Z', 3.2],
          ['2026-11-03T02:00:00.000Z', 3.5],
        ],
      },
    ],
    ...overrides,
  };
}

/** Le texte d'une Sauvegarde modifiée à la main, comme le serait un fichier abîmé. */
function tamperedText(change: (document: Record<string, unknown>) => void): string {
  const document = JSON.parse(serializeBackup(createBackup(preciousData(), EXPORTED_AT)));
  change(document);
  return JSON.stringify(document);
}

describe('toPriceSeries / fromPriceSeries', () => {
  const record = (overrides: Partial<PriceRecord>): PriceRecord => ({
    printingCode: code('OGN-030a'),
    source: 'tcgplayer',
    finish: 'normal',
    recordedAt: '2026-11-01T00:00:00.000Z',
    value: 1,
    ...overrides,
  });

  it('regroupe les Relevés de prix en une série par Version × source × Finition, dans l’ordre des dates', () => {
    const records = [
      record({ recordedAt: '2026-11-02T00:00:00.000Z', value: 2 }),
      record({ finish: 'foil', value: 9 }),
      record({ value: 1 }),
      record({ printingCode: code('SFD-001'), source: 'cardmarket', value: 4 }),
    ];

    expect(toPriceSeries(records)).toEqual([
      {
        printingCode: 'OGN-030a',
        source: 'tcgplayer',
        finish: 'normal',
        points: [
          ['2026-11-01T00:00:00.000Z', 1],
          ['2026-11-02T00:00:00.000Z', 2],
        ],
      },
      {
        printingCode: 'OGN-030a',
        source: 'tcgplayer',
        finish: 'foil',
        points: [['2026-11-01T00:00:00.000Z', 9]],
      },
      {
        printingCode: 'SFD-001',
        source: 'cardmarket',
        finish: 'normal',
        points: [['2026-11-01T00:00:00.000Z', 4]],
      },
    ]);
  });

  it('redonne les mêmes Relevés de prix', () => {
    const records = [
      record({ value: 1 }),
      record({ recordedAt: '2026-11-02T00:00:00.000Z', value: 2 }),
      record({ source: 'cardmarket', finish: 'foil', value: 3 }),
    ];

    expect(fromPriceSeries(toPriceSeries(records))).toEqual(records);
  });
});

describe('readBackup', () => {
  it('relit une Sauvegarde exportée telle quelle', () => {
    const backup = createBackup(preciousData(), EXPORTED_AT);

    expect(readBackup(serializeBackup(backup), READ_AT)).toEqual({ ok: true, backup });
  });

  it('porte le format, la version et la date d’export', () => {
    const backup = createBackup(preciousData(), EXPORTED_AT);

    expect(backup).toMatchObject({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: EXPORTED_AT,
    });
  });

  it('accepte des Données précieuses vides', () => {
    const empty: PreciousData = {
      settings: {},
      collection: [],
      wishlist: [],
      binderSelection: [],
      priceHistory: [],
    };

    expect(readBackup(serializeBackup(createBackup(empty, EXPORTED_AT)), READ_AT)).toMatchObject({
      ok: true,
    });
  });

  it.each([
    ['un texte qui n’est pas du JSON', 'bonjour'],
    ['un autre fichier JSON', '{"name":"package"}'],
    ['un tableau JSON', '[1, 2]'],
    ['un autre format', JSON.stringify({ format: 'autre-app', version: 1 })],
    ['une version illisible', JSON.stringify({ format: BACKUP_FORMAT, version: 'un' })],
  ])('reconnaît %s comme n’étant pas une Sauvegarde', (_, text) => {
    expect(readBackup(text, READ_AT)).toMatchObject({ ok: false, error: { kind: 'not-a-backup' } });
  });

  it('refuse une Sauvegarde d’une version plus récente de l’app', () => {
    const text = tamperedText((document) => {
      document.version = BACKUP_VERSION + 1;
    });

    expect(readBackup(text, READ_AT)).toMatchObject({ ok: false, error: { kind: 'too-recent' } });
  });

  it.each<[string, (document: Record<string, unknown>) => void]>([
    ['une section manquante', (d) => delete d.wishlist],
    ['un champ inconnu', (d) => (d.extra = true)],
    ['une date d’export illisible', (d) => (d.exportedAt = 'hier')],
    ['une quantité nulle', (d) => (d.collection = [owned('OGN-030a', 0)])],
    ['une quantité décimale', (d) => (d.collection = [owned('OGN-030a', 1.5)])],
    [
      'une Version de la Collection sans date d’entrée',
      (d) => (d.collection = [{ ...owned('OGN-030a', 1), addedAt: undefined }]),
    ],
    [
      'une dernière Alerte de prix incomplète dans la Collection',
      (d) => (d.collection = [owned('OGN-030a', 1, { lastAlertPrice: 3 })]),
    ],
    ['un Code de version vide', (d) => (d.binderSelection = [''])],
    [
      'une Version en double dans la Collection',
      (d) => (d.collection = [owned('OGN-030a', 1), owned('OGN-030a', 2)]),
    ],
    ['une Version en double dans le classeur', (d) => (d.binderSelection = ['SFD-001', 'SFD-001'])],
    ['un réglage inconnu', (d) => (d.settings = { couleur: 'bleu' })],
    ['un réglage non permis', (d) => (d.settings = { displayCurrency: 'JPY' })],
    ['une source inconnue', (d) => (d.priceHistory = [{ ...series(), source: 'ebay' }])],
    ['une série sans point', (d) => (d.priceHistory = [{ ...series(), points: [] }])],
    [
      'un point illisible',
      (d) => (d.priceHistory = [{ ...series(), points: [['2026-11-01T00:00:00.000Z', 'cher']] }]),
    ],
    [
      'deux Relevés de prix à la même date',
      (d) =>
        (d.priceHistory = [
          {
            ...series(),
            points: [
              ['2026-11-01T00:00:00.000Z', 1],
              ['2026-11-01T00:00:00.000Z', 2],
            ],
          },
        ]),
    ],
    ['deux séries pour le même prix', (d) => (d.priceHistory = [series(), series()])],
    [
      'une dernière Alerte de prix incomplète',
      (d) =>
        (d.wishlist = [
          {
            printingCode: 'OGN-303s',
            addedAt: '2026-11-01T08:00:00.000Z',
            lastAlertPrice: 12.5,
            lastAlertSource: null,
            lastAlertAt: '2026-11-10T08:00:00.000Z',
          },
        ]),
    ],
  ])('signale une Sauvegarde abîmée : %s', (_, change) => {
    const result = readBackup(tamperedText(change), READ_AT);

    expect(result).toMatchObject({ ok: false, error: { kind: 'damaged' } });
    if (!result.ok) expect(result.error.details).not.toBe('');
  });

  function series() {
    return {
      printingCode: 'OGN-030a',
      source: 'tcgplayer',
      finish: 'normal',
      points: [['2026-11-01T00:00:00.000Z', 1]],
    };
  }
});

describe('readBackup, format 1', () => {
  it('convertit une Sauvegarde du format 1 : les Versions possédées entrent dans la Collection le jour de la lecture, pas à l’export', () => {
    const document = JSON.parse(serializeBackup(createBackup(preciousData(), EXPORTED_AT)));
    document.version = 1;
    document.collection = [{ printingCode: 'OGN-030a', quantity: 2 }];

    const result = readBackup(JSON.stringify(document), READ_AT);

    expect(result).toMatchObject({ ok: true, backup: { version: BACKUP_VERSION } });
    expect(result.ok && result.backup.collection).toEqual([
      {
        printingCode: 'OGN-030a',
        quantity: 2,
        addedAt: READ_AT,
        lastAlertPrice: null,
        lastAlertSource: null,
        lastAlertAt: null,
      },
    ]);
  });

  it('signale une Sauvegarde du format 1 abîmée plutôt que d’échouer pendant la conversion', () => {
    const document = JSON.parse(serializeBackup(createBackup(preciousData(), EXPORTED_AT)));
    document.version = 1;
    document.collection = 'rien';

    expect(readBackup(JSON.stringify(document), READ_AT)).toMatchObject({
      ok: false,
      error: { kind: 'damaged' },
    });
  });
});

describe('upgradeBackupDocument', () => {
  it('applique dans l’ordre les conversions de la version du document jusqu’à la version visée', () => {
    const upgrades = [
      (document: Record<string, unknown>) => ({ ...document, version: 2, steps: ['1→2'] }),
      (document: Record<string, unknown>) => ({
        ...document,
        version: 3,
        steps: [...((document.steps as string[] | undefined) ?? []), '2→3'],
      }),
    ];

    expect(upgradeBackupDocument({ version: 1 }, 3, upgrades, READ_AT)).toEqual({
      version: 3,
      steps: ['1→2', '2→3'],
    });
    expect(upgradeBackupDocument({ version: 2 }, 3, upgrades, READ_AT)).toEqual({
      version: 3,
      steps: ['2→3'],
    });
  });

  it('ne touche pas un document déjà à la version visée', () => {
    const document = { version: 3, data: 'x' };

    expect(upgradeBackupDocument(document, 3, [], READ_AT)).toBe(document);
  });

  it('échoue clairement s’il manque une conversion', () => {
    expect(() => upgradeBackupDocument({ version: 1 }, 2, [], READ_AT)).toThrow(/version 1/);
  });
});
