import { exchangeRate, priceRecord, sourceState } from '@/data/schema';
import { createTestDatabase } from '@/data/testing/createTestDatabase';
import observations from '@/sources/bank-of-canada/__fixtures__/observations.json';
import { bankOfCanadaUrl } from '@/sources/bank-of-canada/bankOfCanada';
import range from '@/sources/frankfurter/__fixtures__/range.json';
import { frankfurterRangeUrl } from '@/sources/frankfurter/frankfurter';
import { fakeFetch } from '@/sources/testing/fakeFetch';
import type { PrintingCode } from '@/domain/printingCode';

import { syncExchangeRates } from './exchangeRates';

const JINX = 'OGN-030a' as PrintingCode;
const at = (iso: string) => () => new Date(iso);
const NOW = at('2026-11-11T13:00:00Z');
/** Plage complète de la fixture : du premier Relevé de prix (samedi 31) à aujourd'hui. */
const RANGE_URL = frankfurterRangeUrl('2026-10-31', '2026-11-11');

type Db = Awaited<ReturnType<typeof createTestDatabase>>['db'];

/** Base dont l'historique de prix commence le samedi 2026-10-31. */
async function databaseWithPricesSince(recordedAt = '2026-10-31T17:00:00.000Z') {
  const { db } = await createTestDatabase();
  db.insert(priceRecord)
    .values({ printingCode: JINX, source: 'tcgplayer', finish: 'foil', recordedAt, value: 3 })
    .run();
  return db;
}

const rates = (db: Db) => db.select().from(exchangeRate).all();
const rateOn = (db: Db, date: string, quote: 'CAD' | 'EUR') =>
  rates(db).find((r) => r.date === date && r.quoteCurrency === quote);

/** Réponse Frankfurter réduite à quelques jours de la fixture. */
function frankfurterDays(...dates: (keyof typeof range.rates)[]) {
  return {
    ...range,
    start_date: dates[0],
    end_date: dates.at(-1),
    rates: Object.fromEntries(dates.map((d) => [d, range.rates[d]])),
  };
}

describe('syncExchangeRates', () => {
  it('récupère les taux depuis le premier Relevé de prix, auprès de Frankfurter', async () => {
    const db = await databaseWithPricesSince();
    const { fetch } = fakeFetch({ [RANGE_URL]: { body: range } });

    const outcome = await syncExchangeRates({ db, fetch, now: NOW });

    expect(outcome).toBe('refreshed');
    expect(rates(db)).toHaveLength(16);
    expect(rateOn(db, '2026-10-30', 'CAD')).toEqual({
      date: '2026-10-30',
      baseCurrency: 'USD',
      quoteCurrency: 'CAD',
      rate: 1.3969,
      source: 'frankfurter',
    });
  });

  it('sans historique de prix, ne demande que le dernier taux', async () => {
    const { db } = await createTestDatabase();
    const { fetch, requests } = fakeFetch({
      [frankfurterRangeUrl('2026-11-11', '2026-11-11')]: { body: frankfurterDays('2026-11-10') },
    });

    await syncExchangeRates({ db, fetch, now: NOW });

    expect(requests).toHaveLength(1);
    expect(rateOn(db, '2026-11-10', 'EUR')?.rate).toBe(0.89174);
  });

  /** Base dont les taux ont été récupérés le 2026-11-11 à 13 h. */
  async function syncedDatabase() {
    const db = await databaseWithPricesSince();
    await syncExchangeRates({
      db,
      fetch: fakeFetch({ [RANGE_URL]: { body: range } }).fetch,
      now: NOW,
    });
    return db;
  }

  it('ne recontacte pas les sources moins de 24 h après un succès', async () => {
    const db = await syncedDatabase();
    const { fetch, requests } = fakeFetch({});

    const outcome = await syncExchangeRates({ db, fetch, now: at('2026-11-12T12:59:00Z') });

    expect(outcome).toBe('skipped');
    expect(requests).toEqual([]);
  });

  it('le lendemain, ne demande que les jours qui suivent le dernier taux connu', async () => {
    const db = await syncedDatabase();
    const { fetch, requests } = fakeFetch({
      [frankfurterRangeUrl('2026-11-10', '2026-11-12')]: { body: frankfurterDays('2026-11-10') },
    });

    await syncExchangeRates({ db, fetch, now: at('2026-11-12T13:00:00Z') });

    expect(requests.map((r) => r.url)).toEqual([frankfurterRangeUrl('2026-11-10', '2026-11-12')]);
  });

  it('comble l’historique quand des Relevés de prix plus anciens apparaissent', async () => {
    const db = await syncedDatabase();
    db.insert(priceRecord)
      .values({
        printingCode: JINX,
        source: 'cardmarket',
        finish: 'foil',
        recordedAt: '2026-10-25T08:00:00.000Z',
        value: 2.5,
      })
      .run();
    const { fetch, requests } = fakeFetch({
      [frankfurterRangeUrl('2026-10-25', '2026-10-30')]: { body: frankfurterDays('2026-10-30') },
      [frankfurterRangeUrl('2026-11-10', '2026-11-12')]: { body: frankfurterDays('2026-11-10') },
    });

    await syncExchangeRates({ db, fetch, now: at('2026-11-12T13:00:00Z') });

    expect(requests).toHaveLength(2);
  });

  it('passe à la Banque du Canada si Frankfurter échoue', async () => {
    const db = await databaseWithPricesSince('2026-11-03T17:00:00.000Z');
    const { fetch } = fakeFetch({
      [frankfurterRangeUrl('2026-11-03', '2026-11-11')]: { status: 503 },
      [bankOfCanadaUrl('2026-10-24', '2026-11-11')]: { body: observations },
    });

    const outcome = await syncExchangeRates({ db, fetch, now: NOW });

    expect(outcome).toBe('refreshed');
    expect(rateOn(db, '2026-11-06', 'CAD')).toMatchObject({
      rate: 1.4113,
      source: 'bank-of-canada',
    });
  });

  it('un taux Frankfurter remplace ensuite le taux de secours du même jour, jamais l’inverse', async () => {
    const db = await databaseWithPricesSince('2026-11-03T17:00:00.000Z');
    await syncExchangeRates({
      db,
      fetch: fakeFetch({
        [frankfurterRangeUrl('2026-11-03', '2026-11-11')]: { status: 503 },
        [bankOfCanadaUrl('2026-10-24', '2026-11-11')]: { body: observations },
      }).fetch,
      now: NOW,
    });

    await syncExchangeRates({
      db,
      fetch: fakeFetch({
        [frankfurterRangeUrl('2026-11-10', '2026-11-12')]: { body: frankfurterDays('2026-11-10') },
      }).fetch,
      now: at('2026-11-12T13:00:00Z'),
    });
    await syncExchangeRates({
      db,
      fetch: fakeFetch({
        [frankfurterRangeUrl('2026-11-10', '2026-11-13')]: { status: 503 },
        [bankOfCanadaUrl('2026-10-31', '2026-11-13')]: { body: observations },
      }).fetch,
      now: at('2026-11-13T13:00:00Z'),
    });

    expect(rateOn(db, '2026-11-10', 'CAD')).toMatchObject({ rate: 1.4136, source: 'frankfurter' });
    expect(rateOn(db, '2026-11-09', 'CAD')).toMatchObject({ source: 'bank-of-canada' });
  });

  it('si les deux sources échouent, garde les taux connus, note l’erreur et réessaie sans attendre', async () => {
    const db = await syncedDatabase();
    const before = rates(db);
    const offline = fakeFetch({
      [frankfurterRangeUrl('2026-11-10', '2026-11-12')]: new TypeError('Network request failed'),
      [bankOfCanadaUrl('2026-10-31', '2026-11-12')]: new TypeError('Network request failed'),
    });

    await expect(
      syncExchangeRates({ db, fetch: offline.fetch, now: at('2026-11-12T13:00:00Z') }),
    ).rejects.toMatchObject({ kind: 'network' });

    expect(rates(db)).toEqual(before);
    expect(db.select().from(sourceState).all()).toContainEqual(
      expect.objectContaining({
        source: 'exchange-rates',
        lastErrorAt: '2026-11-12T13:00:00.000Z',
      }),
    );
    const retry = fakeFetch({
      [frankfurterRangeUrl('2026-11-10', '2026-11-12')]: { body: frankfurterDays('2026-11-10') },
    });
    expect(
      await syncExchangeRates({ db, fetch: retry.fetch, now: at('2026-11-12T13:05:00Z') }),
    ).toBe('refreshed');
  });

  it('rejette un format inattendu des deux sources sans rien enregistrer', async () => {
    const db = await databaseWithPricesSince();
    const { fetch } = fakeFetch({
      [RANGE_URL]: { body: { ...range, base: 'EUR' } },
      [bankOfCanadaUrl('2026-10-21', '2026-11-11')]: { body: { observations: 'none' } },
    });

    await expect(syncExchangeRates({ db, fetch, now: NOW })).rejects.toMatchObject({
      kind: 'format',
    });
    expect(rates(db)).toEqual([]);
  });
});
