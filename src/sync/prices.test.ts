import { currentPrice, priceRecord, sourceState } from '@/data/schema';
import { createTestDatabase } from '@/data/testing/createTestDatabase';
import prices from '@/sources/rifthunt/__fixtures__/prices.json';
import { RIFTHUNT_PRICES_URL } from '@/sources/rifthunt/prices';
import { rifthuntResponses } from '@/sources/rifthunt/testing/rifthuntResponses';
import { fakeFetch } from '@/sources/testing/fakeFetch';

import { syncCatalog } from './catalog';
import { syncTcgplayerPrices } from './prices';

const at = (iso: string) => () => new Date(iso);
const LAST_MODIFIED = 'Sun, 08 Nov 2026 15:10:21 GMT';
const pricesResponse = (body: unknown = prices) => ({
  [RIFTHUNT_PRICES_URL]: { body, headers: { 'Last-Modified': LAST_MODIFIED } },
});

/** Base avec le Catalogue des fixtures, téléchargé le 2026-11-08 à 10 h. */
async function catalogDatabase() {
  const { db } = await createTestDatabase();
  await syncCatalog({
    db,
    fetch: fakeFetch(rifthuntResponses).fetch,
    now: at('2026-11-08T10:00:00Z'),
  });
  return db;
}

/** Les prix de la fixture, avec le `market` foil de Jinx (OGN-030a) changé. */
function pricesWithJinxAt(market: number, updatedAt: string) {
  return {
    ...prices,
    prices: prices.prices.map((row) =>
      row.tcgId === '652803'
        ? {
            ...row,
            updatedAt,
            finishes: { ...row.finishes, foil: { ...row.finishes.foil, market } },
          }
        : { ...row, updatedAt },
    ),
  };
}

describe('syncTcgplayerPrices', () => {
  it('enregistre les prix du jour et le premier relevé de chaque Version', async () => {
    const db = await catalogDatabase();
    const { fetch } = fakeFetch(pricesResponse());

    const outcome = await syncTcgplayerPrices({ db, fetch, now: at('2026-11-08T11:00:00Z') });

    expect(outcome).toBe('refreshed');
    expect(db.select().from(currentPrice).all()).toContainEqual({
      printingCode: 'OGN-030a',
      source: 'tcgplayer',
      finish: 'foil',
      referenceMetricValue: 2.95,
      metrics: { low: 0.99, mid: 3.75, high: 100, market: 2.95, directLow: null },
      currency: 'USD',
      publishedAt: '2026-11-07T17:01:52.522Z',
    });
    expect(db.select().from(priceRecord).all()).toContainEqual({
      printingCode: 'OGN-030a',
      source: 'tcgplayer',
      finish: 'foil',
      recordedAt: '2026-11-07T17:01:52.522Z',
      value: 2.95,
    });
  });

  it('ignore les prix d’une Version absente du Catalogue', async () => {
    const db = await catalogDatabase();
    const { fetch } = fakeFetch(pricesResponse());

    await syncTcgplayerPrices({ db, fetch, now: at('2026-11-08T11:00:00Z') });

    const codes = db.select({ code: currentPrice.printingCode }).from(currentPrice).all();
    expect(codes.map((row) => row.code)).not.toContain('OGN-001');
    expect(new Set(codes.map((row) => row.code)).size).toBe(8);
  });

  /** Base où les prix de la fixture ont été enregistrés le 2026-11-08 à 11 h. */
  async function pricedDatabase() {
    const db = await catalogDatabase();
    await syncTcgplayerPrices({
      db,
      fetch: fakeFetch(pricesResponse()).fetch,
      now: at('2026-11-08T11:00:00Z'),
    });
    return db;
  }
  const records = (db: Awaited<ReturnType<typeof pricedDatabase>>) =>
    db.select().from(priceRecord).all();

  it('ne contacte pas RiftHunt moins de 6 h après un succès', async () => {
    const db = await pricedDatabase();
    const { fetch, requests } = fakeFetch(pricesResponse());

    const outcome = await syncTcgplayerPrices({ db, fetch, now: at('2026-11-08T16:59:00Z') });

    expect(outcome).toBe('skipped');
    expect(requests).toEqual([]);
  });

  it('relit le même fichier sans créer de relevé', async () => {
    const db = await pricedDatabase();
    const before = records(db);
    const { fetch } = fakeFetch(pricesResponse());

    await syncTcgplayerPrices({ db, fetch, now: at('2026-11-08T18:00:00Z') }, { force: true });

    expect(records(db)).toEqual(before);
  });

  it('ajoute un relevé quand la valeur change, daté par TCGplayer', async () => {
    const db = await pricedDatabase();
    const changed = pricesWithJinxAt(3.1, '2026-11-08T17:00:00.000Z');
    const { fetch } = fakeFetch(pricesResponse(changed));

    await syncTcgplayerPrices({ db, fetch, now: at('2026-11-08T18:00:00Z') });

    const jinx = records(db).filter((r) => r.printingCode === 'OGN-030a');
    expect(jinx.map((r) => [r.recordedAt, r.value])).toEqual([
      ['2026-11-07T17:01:52.522Z', 2.95],
      ['2026-11-08T17:00:00.000Z', 3.1],
    ]);
    expect(records(db)).toHaveLength(9);
  });

  it('envoie Last-Modified et ne touche à rien si le fichier est inchangé (304)', async () => {
    const db = await pricedDatabase();
    const before = db.select().from(currentPrice).all();
    const { fetch, requests } = fakeFetch({ [RIFTHUNT_PRICES_URL]: { status: 304 } });

    const outcome = await syncTcgplayerPrices({ db, fetch, now: at('2026-11-08T18:00:00Z') });

    expect(outcome).toBe('unchanged');
    expect(requests[0]?.headers['if-modified-since']).toBe(LAST_MODIFIED);
    expect(db.select().from(currentPrice).all()).toEqual(before);
    // Le succès est noté : pas de nouvelle tentative avant 6 h.
    expect(await syncTcgplayerPrices({ db, fetch, now: at('2026-11-08T19:00:00Z') })).toBe(
      'skipped',
    );
  });

  it('garde les derniers prix si le téléchargement échoue, et réessaie au prochain appel', async () => {
    const db = await pricedDatabase();
    const before = db.select().from(currentPrice).all();
    const offline = fakeFetch({ [RIFTHUNT_PRICES_URL]: new TypeError('Network request failed') });

    await expect(
      syncTcgplayerPrices({ db, fetch: offline.fetch, now: at('2026-11-08T18:00:00Z') }),
    ).rejects.toMatchObject({ kind: 'network' });

    expect(db.select().from(currentPrice).all()).toEqual(before);
    expect(db.select().from(sourceState).all()).toContainEqual(
      expect.objectContaining({
        source: 'rifthunt-prices',
        lastErrorAt: '2026-11-08T18:00:00.000Z',
      }),
    );
    const retry = fakeFetch(pricesResponse());
    expect(
      await syncTcgplayerPrices({ db, fetch: retry.fetch, now: at('2026-11-08T18:05:00Z') }),
    ).toBe('refreshed');
  });
});
