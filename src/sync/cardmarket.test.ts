import { eq } from 'drizzle-orm';

import { replaceCatalog } from '@/data/catalog';
import { currentPrice, priceRecord, printing, sourceState } from '@/data/schema';
import { recordSourceSuccess } from '@/data/sourceState';
import { catalogOf, expansionOf, printingOf } from '@/data/testing/catalogFactory';
import { createTestDatabase } from '@/data/testing/createTestDatabase';
import type { Finish } from '@/domain/price';
import guide from '@/sources/cardmarket/__fixtures__/price-guide.json';
import { CARDMARKET_PRICE_GUIDE_URL } from '@/sources/cardmarket/priceGuide';
import links from '@/sources/openrift/__fixtures__/links.json';
import { OPENRIFT_LINKS_URL } from '@/sources/openrift/links';
import { fakeFetch } from '@/sources/testing/fakeFetch';

import { syncCardmarketLinks } from './cardmarketLinks';
import { syncCardmarketPrices } from './prices';

const at = (iso: string) => () => new Date(iso);
const LAST_MODIFIED = 'Wed, 11 Nov 2026 01:45:57 GMT';
const guideResponse = (body: unknown = guide) => ({
  [CARDMARKET_PRICE_GUIDE_URL]: { body, headers: { 'Last-Modified': LAST_MODIFIED } },
});

type Db = Awaited<ReturnType<typeof createTestDatabase>>['db'];

const version = (code: string, number: string, tcgId: number | null, finishes: Finish[]) => ({
  ...printingOf(code, number, `${code}-${number}`),
  tcgId,
  finishes,
});

/** Les Versions des fixtures, plus une Version normale + foil (tcgId 652916). */
const CATALOG = catalogOf(
  [expansionOf('OGN'), expansionOf('OPP', { isPromo: true })],
  [
    version('OGN', '030a', 652803, ['foil']),
    version('OGN', '303s', 653102, ['foil']),
    version('OGN', '100', 652916, ['normal', 'foil']),
    // Annie (Metal) : OpenRift ne connaît pas son produit Cardmarket.
    version('OPP', '017', 669265, ['foil']),
    version('OGN', '271', null, []),
  ],
);

/** Base avec ce Catalogue, téléchargé le 2026-11-11 à 10 h. */
async function catalogDatabase() {
  const { db } = await createTestDatabase();
  replaceCatalog(db, CATALOG);
  recordSourceSuccess(db, 'rifthunt-catalog', '2026-11-11T10:00:00.000Z');
  return db;
}

const cardmarketIds = (db: Db) =>
  Object.fromEntries(
    db
      .select({ code: printing.printingCode, id: printing.cardmarketProductId })
      .from(printing)
      .all()
      .map((row) => [row.code, row.id]),
  );

/** Base dont la correspondance OpenRift a été récupérée le 2026-11-11 à 10 h 05. */
async function linkedDatabase() {
  const db = await catalogDatabase();
  await syncCardmarketLinks({
    db,
    fetch: fakeFetch({ [OPENRIFT_LINKS_URL]: { body: links } }).fetch,
    now: at('2026-11-11T10:05:00Z'),
  });
  return db;
}

describe('syncCardmarketLinks', () => {
  it('relie les Versions à leur produit Cardmarket, par leur tcgId', async () => {
    const db = await linkedDatabase();

    expect(cardmarketIds(db)).toEqual({
      'OGN-030a': 847147,
      'OGN-303s': 847508,
      'OGN-100': 847289,
      'OPP-017': null,
      'OGN-271': null,
    });
  });

  it('ne recontacte pas OpenRift tant que le Catalogue n’a pas été retéléchargé', async () => {
    const db = await linkedDatabase();
    const { fetch, requests } = fakeFetch({ [OPENRIFT_LINKS_URL]: { body: links } });

    expect(await syncCardmarketLinks({ db, fetch, now: at('2026-11-12T10:00:00Z') })).toBe(
      'skipped',
    );
    expect(requests).toEqual([]);

    recordSourceSuccess(db, 'rifthunt-catalog', '2026-11-18T10:00:00.000Z');
    expect(await syncCardmarketLinks({ db, fetch, now: at('2026-11-18T10:01:00Z') })).toBe(
      'refreshed',
    );
  });

  it('garde la dernière correspondance si OpenRift est indisponible, et réessaie ensuite', async () => {
    const db = await linkedDatabase();
    const before = cardmarketIds(db);
    recordSourceSuccess(db, 'rifthunt-catalog', '2026-11-18T10:00:00.000Z');
    replaceCatalog(db, CATALOG);
    const offline = fakeFetch({ [OPENRIFT_LINKS_URL]: { status: 503 } });

    await expect(
      syncCardmarketLinks({ db, fetch: offline.fetch, now: at('2026-11-18T10:01:00Z') }),
    ).rejects.toMatchObject({ kind: 'http' });

    expect(cardmarketIds(db)).toEqual(before);
    expect(db.select().from(sourceState).all()).toContainEqual(
      expect.objectContaining({
        source: 'openrift-links',
        lastErrorAt: '2026-11-18T10:01:00.000Z',
      }),
    );
    const retry = fakeFetch({ [OPENRIFT_LINKS_URL]: { body: links } });
    expect(
      await syncCardmarketLinks({ db, fetch: retry.fetch, now: at('2026-11-18T10:02:00Z') }),
    ).toBe('refreshed');
  });
});

describe('syncCardmarketPrices', () => {
  const pricesOf = (db: Db) =>
    db.select().from(currentPrice).where(eq(currentPrice.source, 'cardmarket')).all();

  /** Base où les prix Cardmarket ont été enregistrés le 2026-11-11 à 11 h. */
  async function pricedDatabase() {
    const db = await linkedDatabase();
    await syncCardmarketPrices({
      db,
      fetch: fakeFetch(guideResponse()).fetch,
      now: at('2026-11-11T11:00:00Z'),
    });
    return db;
  }

  it('lit le trend de chaque Finition réelle de la Version, en EUR, daté par le fichier', async () => {
    const db = await pricedDatabase();

    expect(pricesOf(db)).toContainEqual({
      printingCode: 'OGN-030a',
      source: 'cardmarket',
      finish: 'foil',
      referenceMetricValue: 3.52,
      metrics: { avg: 3.53, low: 1.15, trend: 3.52, avg1: 3.73, avg7: 3.66, avg30: 3.5 },
      currency: 'EUR',
      publishedAt: '2026-11-11T01:45:56.000Z',
    });
    // OGN-030a n'existe qu'en foil : ses champs normaux (trend 2,64) sont ignorés.
    const finishesOf = (code: string) =>
      pricesOf(db)
        .filter((p) => p.printingCode === code)
        .map((p) => [p.finish, p.referenceMetricValue]);
    expect(finishesOf('OGN-030a')).toEqual([['foil', 3.52]]);
    expect(finishesOf('OGN-100')).toEqual(
      expect.arrayContaining([
        ['normal', 0.1],
        ['foil', expect.any(Number)],
      ]),
    );
    expect(finishesOf('OPP-017')).toEqual([]);
  });

  it('ajoute le premier relevé de chaque Version, daté par le createdAt du fichier', async () => {
    const db = await pricedDatabase();

    expect(db.select().from(priceRecord).all()).toContainEqual({
      printingCode: 'OGN-303s',
      source: 'cardmarket',
      finish: 'foil',
      recordedAt: '2026-11-11T01:45:56.000Z',
      value: 2572.24,
    });
  });

  it('ne contacte pas Cardmarket moins de 6 h après un succès, et ne touche à rien si le fichier est inchangé', async () => {
    const db = await pricedDatabase();
    const before = pricesOf(db);
    const unchanged = fakeFetch({ [CARDMARKET_PRICE_GUIDE_URL]: { status: 304 } });

    expect(
      await syncCardmarketPrices({ db, fetch: unchanged.fetch, now: at('2026-11-11T16:59:00Z') }),
    ).toBe('skipped');
    expect(
      await syncCardmarketPrices({ db, fetch: unchanged.fetch, now: at('2026-11-11T17:00:00Z') }),
    ).toBe('unchanged');
    expect(unchanged.requests[0]?.headers['if-modified-since']).toBe(LAST_MODIFIED);
    expect(pricesOf(db)).toEqual(before);
  });

  it('retélécharge tout après une nouvelle correspondance, pour donner un prix aux Versions reliées', async () => {
    const db = await pricedDatabase();
    // Nouveau Catalogue à 11 h 20, donc nouvelle correspondance à 11 h 30.
    recordSourceSuccess(db, 'rifthunt-catalog', '2026-11-11T11:20:00.000Z');
    await syncCardmarketLinks({
      db,
      fetch: fakeFetch({ [OPENRIFT_LINKS_URL]: { body: links } }).fetch,
      now: at('2026-11-11T11:30:00Z'),
    });
    const { fetch, requests } = fakeFetch(guideResponse());

    // Sans attendre les 6 h.
    const outcome = await syncCardmarketPrices({ db, fetch, now: at('2026-11-11T12:00:00Z') });

    expect(outcome).toBe('refreshed');
    expect(requests[0]?.headers['if-modified-since']).toBeUndefined();
  });

  it('garde les derniers prix si Cardmarket est indisponible, et note l’erreur', async () => {
    const db = await pricedDatabase();
    const before = pricesOf(db);
    const offline = fakeFetch({
      [CARDMARKET_PRICE_GUIDE_URL]: new TypeError('Network request failed'),
    });

    await expect(
      syncCardmarketPrices({ db, fetch: offline.fetch, now: at('2026-11-11T18:00:00Z') }),
    ).rejects.toMatchObject({ kind: 'network' });

    expect(pricesOf(db)).toEqual(before);
    expect(db.select().from(sourceState).all()).toContainEqual(
      expect.objectContaining({
        source: 'cardmarket-prices',
        lastErrorAt: '2026-11-11T18:00:00.000Z',
      }),
    );
  });
});
