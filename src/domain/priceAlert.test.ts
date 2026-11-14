import type { IsoDate, IsoDateTime } from './dates';
import { priceAlerts, type PriceAlertCandidate } from './priceAlert';
import type { PrintingCode } from './printingCode';

const JINX = 'OGN-030a' as PrintingCode;
const TODAY: IsoDate = '2026-11-14';
const ADDED: IsoDateTime = '2026-11-01T12:00:00.000Z';

function at(date: IsoDate): IsoDateTime {
  return `${date}T08:00:00.000Z`;
}

function candidate(overrides: Partial<PriceAlertCandidate> = {}): PriceAlertCandidate {
  return {
    printingCode: JINX,
    cardName: 'Jinx',
    addedAt: ADDED,
    lastAlert: null,
    records: [
      { recordedAt: at('2026-10-20'), value: 10 },
      { recordedAt: at('2026-11-10'), value: 8.5 },
    ],
    ...overrides,
  };
}

const DROP = { direction: 'drop', source: 'tcgplayer', threshold: 15, today: TODAY } as const;
const RISE = { ...DROP, direction: 'rise' } as const;

describe('priceAlerts, en baisse (souhaits)', () => {
  it('alerte quand la baisse depuis l’ajout atteint le seuil', () => {
    expect(priceAlerts([candidate()], DROP)).toEqual([
      {
        printingCode: JINX,
        cardName: 'Jinx',
        direction: 'drop',
        source: 'tcgplayer',
        price: 8.5,
        change: expect.closeTo(-15),
      },
    ]);
  });

  it('se tait tant que la baisse reste sous le seuil', () => {
    const records = [
      { recordedAt: at('2026-10-20'), value: 10 },
      { recordedAt: at('2026-11-10'), value: 8.6 },
    ];

    expect(priceAlerts([candidate({ records })], DROP)).toEqual([]);
  });

  it('part du premier relevé qui suit l’ajout s’il n’y en a pas ce jour-là', () => {
    const records = [
      { recordedAt: at('2026-11-05'), value: 20 },
      { recordedAt: at('2026-11-12'), value: 17 },
    ];

    expect(priceAlerts([candidate({ records })], DROP)).toEqual([
      {
        printingCode: JINX,
        cardName: 'Jinx',
        direction: 'drop',
        source: 'tcgplayer',
        price: 17,
        change: expect.closeTo(-15),
      },
    ]);
  });

  it('après une alerte, ne réalerte que si le prix rebaisse du seuil depuis celle-ci', () => {
    const lastAlert = { price: 8.5, source: 'tcgplayer', at: at('2026-11-10') } as const;
    const stillLow = candidate({ lastAlert });
    const lowerAgain = candidate({
      lastAlert,
      records: [...candidate().records, { recordedAt: at('2026-11-13'), value: 7.2 }],
    });

    expect(priceAlerts([stillLow], DROP)).toEqual([]);
    expect(priceAlerts([lowerAgain], DROP)).toEqual([
      {
        printingCode: JINX,
        cardName: 'Jinx',
        direction: 'drop',
        source: 'tcgplayer',
        price: 7.2,
        change: expect.closeTo(-15.29, 1),
      },
    ]);
  });

  it('ignore une alerte donnée dans une autre Source de prix : on ne compare pas des euros à des dollars', () => {
    const lastAlert = { price: 5, source: 'cardmarket', at: at('2026-11-10') } as const;

    expect(priceAlerts([candidate({ lastAlert })], DROP)).toEqual([
      {
        printingCode: JINX,
        cardName: 'Jinx',
        direction: 'drop',
        source: 'tcgplayer',
        price: 8.5,
        change: expect.closeTo(-15),
      },
    ]);
  });

  it('se tait pour une Version sans relevé', () => {
    expect(priceAlerts([candidate({ records: [] })], DROP)).toEqual([]);
  });
});

describe('priceAlerts, en hausse (Collection)', () => {
  const risen = [
    { recordedAt: at('2026-10-20'), value: 10 },
    { recordedAt: at('2026-11-10'), value: 11.5 },
  ];

  it('alerte quand la hausse depuis l’entrée dans la Collection atteint le seuil', () => {
    expect(priceAlerts([candidate({ records: risen })], RISE)).toEqual([
      {
        printingCode: JINX,
        cardName: 'Jinx',
        direction: 'rise',
        source: 'tcgplayer',
        price: 11.5,
        change: expect.closeTo(15),
      },
    ]);
  });

  it('se tait tant que la hausse reste sous le seuil', () => {
    const records = [
      { recordedAt: at('2026-10-20'), value: 10 },
      { recordedAt: at('2026-11-10'), value: 11.4 },
    ];

    expect(priceAlerts([candidate({ records })], RISE)).toEqual([]);
  });

  it('ne signale jamais une baisse comme une hausse, ni l’inverse', () => {
    expect(priceAlerts([candidate()], RISE)).toEqual([]);
    expect(priceAlerts([candidate({ records: risen })], DROP)).toEqual([]);
  });

  it('après une alerte, ne réalerte que si le prix remonte du seuil depuis celle-ci', () => {
    const lastAlert = { price: 11.5, source: 'tcgplayer', at: at('2026-11-10') } as const;
    const higherAgain = [...risen, { recordedAt: at('2026-11-13'), value: 13.3 }];

    expect(priceAlerts([candidate({ lastAlert, records: risen })], RISE)).toEqual([]);
    expect(priceAlerts([candidate({ lastAlert, records: higherAgain })], RISE)).toEqual([
      {
        printingCode: JINX,
        cardName: 'Jinx',
        direction: 'rise',
        source: 'tcgplayer',
        price: 13.3,
        change: expect.closeTo(15.65, 1),
      },
    ]);
  });
});
