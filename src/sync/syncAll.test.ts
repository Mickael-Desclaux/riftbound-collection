import { eq } from 'drizzle-orm';

import { collectionEntry, currentPrice, exchangeRate, printing } from '@/data/schema';
import { recordSourceSuccess } from '@/data/sourceState';
import type { PrintingCode } from '@/domain/printingCode';
import { createTestDatabase } from '@/data/testing/createTestDatabase';
import guide from '@/sources/cardmarket/__fixtures__/price-guide.json';
import { CARDMARKET_PRICE_GUIDE_URL } from '@/sources/cardmarket/priceGuide';
import links from '@/sources/openrift/__fixtures__/links.json';
import { OPENRIFT_LINKS_URL } from '@/sources/openrift/links';
import prices from '@/sources/rifthunt/__fixtures__/prices.json';
import range from '@/sources/frankfurter/__fixtures__/range.json';
import { frankfurterRangeUrl } from '@/sources/frankfurter/frankfurter';
import { RIFTHUNT_PRICES_URL } from '@/sources/rifthunt/prices';
import {
  pageUrl,
  rifthuntResponses,
  sets,
  SETS_URL,
} from '@/sources/rifthunt/testing/rifthuntResponses';
import { fakeFetch } from '@/sources/testing/fakeFetch';

import { syncCatalog } from './catalog';
import { syncAll } from './syncAll';

const at = (iso: string) => () => new Date(iso);
const JINX = 'OGN-030a' as PrintingCode;
const UNKNOWN = 'XXX-001' as PrintingCode;

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

/** Toutes les sources répondent, sauf celles de `failing`. */
function responses(failing: string[] = []) {
  const all = {
    ...rifthuntResponses,
    [OPENRIFT_LINKS_URL]: { body: links },
    [RIFTHUNT_PRICES_URL]: { body: prices },
    [CARDMARKET_PRICE_GUIDE_URL]: { body: guide },
    [frankfurterRangeUrl('2026-11-06', '2026-11-09')]: { body: range },
    [frankfurterRangeUrl('2026-11-10', '2026-11-10')]: { body: range },
  };
  return Object.fromEntries(
    Object.entries(all).map(([url, ok]) => [url, failing.includes(url) ? { status: 503 } : ok]),
  );
}

describe('syncAll', () => {
  it('met à jour chaque source indépendamment : une panne n’empêche pas les autres', async () => {
    const db = await catalogDatabase();
    const { fetch } = fakeFetch(responses([SETS_URL]));

    const report = await syncAll({ db, fetch, now: at('2026-11-09T10:00:00Z') });

    expect(report.failures.map((f) => f.step)).toEqual(['catalog']);
    expect(db.select().from(currentPrice).all().length).toBeGreaterThan(0);
    expect(db.select().from(exchangeRate).all().length).toBeGreaterThan(0);
  });

  it('une panne Cardmarket n’empêche pas les prix TCGplayer', async () => {
    const db = await catalogDatabase();
    const { fetch } = fakeFetch(responses([CARDMARKET_PRICE_GUIDE_URL]));

    const report = await syncAll({ db, fetch, now: at('2026-11-09T10:00:00Z') });

    expect(report.failures.map((f) => f.step)).toEqual(['cardmarketPrices']);
    const pricesOf = (source: 'tcgplayer' | 'cardmarket') =>
      db.select().from(currentPrice).where(eq(currentPrice.source, source)).all();
    expect(pricesOf('tcgplayer').length).toBeGreaterThan(0);
    expect(pricesOf('cardmarket')).toEqual([]);
  });

  it('relie le Catalogue à Cardmarket et enregistre ses prix', async () => {
    const db = await catalogDatabase();

    const report = await syncAll({
      db,
      fetch: fakeFetch(responses()).fetch,
      now: at('2026-11-09T10:00:00Z'),
    });

    expect(report.failures).toEqual([]);
    expect(
      db.select().from(currentPrice).where(eq(currentPrice.source, 'cardmarket')).all(),
    ).toContainEqual(
      expect.objectContaining({ printingCode: 'OGN-030a', referenceMetricValue: 3.52 }),
    );
  });

  describe('Tout resynchroniser', () => {
    it('retélécharge tout, même un fichier inchangé ou déjà vérifié aujourd’hui', async () => {
      const db = await catalogDatabase();
      await syncAll({ db, fetch: fakeFetch(responses()).fetch, now: at('2026-11-09T10:00:00Z') });
      recordSourceSuccess(db, 'rifthunt-prices', '2026-11-10T10:00:00Z', {
        lastModified: 'Tue, 10 Nov 2026 08:00:00 GMT',
      });
      const { fetch, requests } = fakeFetch(responses());

      const report = await syncAll(
        { db, fetch, now: at('2026-11-10T11:00:00Z') },
        { mode: 'resync' },
      );

      expect(report.failures).toEqual([]);
      const urls = requests.map((r) => r.url);
      expect(urls).toContain(pageUrl(1));
      expect(urls).toContain(OPENRIFT_LINKS_URL);
      expect(urls).toContain(frankfurterRangeUrl('2026-11-10', '2026-11-10'));
      const pricesRequest = requests.find((r) => r.url === RIFTHUNT_PRICES_URL);
      expect(pricesRequest?.headers['if-modified-since']).toBeUndefined();
    });
  });

  describe('Reconstruire le catalogue', () => {
    it('remplace tout le Catalogue, sans toucher aux Données précieuses', async () => {
      const db = await catalogDatabase();
      await syncAll({ db, fetch: fakeFetch(responses()).fetch, now: at('2026-11-09T10:00:00Z') });
      const linked = db.select().from(printing).where(eq(printing.printingCode, JINX)).get();
      // Un lien et un prix qu'aucune source ne donne plus.
      db.update(printing)
        .set({ cardmarketProductId: 999_999 })
        .where(eq(printing.printingCode, JINX))
        .run();
      db.insert(currentPrice)
        .values({
          printingCode: UNKNOWN,
          source: 'tcgplayer',
          finish: 'normal',
          referenceMetricValue: 1,
          metrics: { market: 1 },
          currency: 'USD',
          publishedAt: '2026-11-01T00:00:00Z',
        })
        .run();
      db.insert(collectionEntry).values({ printingCode: JINX, quantity: 2 }).run();

      const report = await syncAll(
        { db, fetch: fakeFetch(responses()).fetch, now: at('2026-11-10T11:00:00Z') },
        { mode: 'rebuild' },
      );

      expect(report.failures).toEqual([]);
      expect(
        db.select().from(printing).where(eq(printing.printingCode, JINX)).get()
          ?.cardmarketProductId,
      ).toBe(linked?.cardmarketProductId);
      expect(
        db.select().from(currentPrice).where(eq(currentPrice.printingCode, UNKNOWN)).all(),
      ).toEqual([]);
      expect(db.select().from(currentPrice).all().length).toBeGreaterThan(0);
      expect(db.select().from(collectionEntry).all()).toEqual([
        expect.objectContaining({ printingCode: 'OGN-030a', quantity: 2 }),
      ]);
    });

    it('garde la dernière correspondance OpenRift si OpenRift est indisponible', async () => {
      const db = await catalogDatabase();
      await syncAll({ db, fetch: fakeFetch(responses()).fetch, now: at('2026-11-09T10:00:00Z') });
      const linkOf = () =>
        db.select().from(printing).where(eq(printing.printingCode, JINX)).get()
          ?.cardmarketProductId;
      const before = linkOf();

      const report = await syncAll(
        {
          db,
          fetch: fakeFetch(responses([OPENRIFT_LINKS_URL])).fetch,
          now: at('2026-11-10T11:00:00Z'),
        },
        { mode: 'rebuild' },
      );

      expect(report.failures.map((f) => f.step)).toEqual(['cardmarketLinks']);
      expect(before).not.toBeNull();
      expect(linkOf()).toBe(before);
    });

    it('garde le Catalogue de l’appareil si le téléchargement échoue', async () => {
      const db = await catalogDatabase();
      const before = db.select().from(printing).all().length;

      const report = await syncAll(
        { db, fetch: fakeFetch(responses([pageUrl(1)])).fetch, now: at('2026-11-09T11:00:00Z') },
        { mode: 'rebuild' },
      );

      expect(report.failures.map((f) => f.step)).toContain('catalog');
      expect(db.select().from(printing).all()).toHaveLength(before);
    });
  });

  describe('Nouvelle Extension', () => {
    /** Le Catalogue téléchargé avant la sortie de Vendetta. */
    async function databaseBeforeVendetta() {
      const { db } = await createTestDatabase();
      const withoutVendetta = { ...sets, data: sets.data.filter((set) => set.code !== 'ven') };
      await syncCatalog({
        db,
        fetch: fakeFetch({ ...rifthuntResponses, [SETS_URL]: { body: withoutVendetta } }).fetch,
        now: at('2026-11-08T10:00:00Z'),
      });
      return db;
    }

    it('signale une Extension apparue dans /sets', async () => {
      const db = await databaseBeforeVendetta();

      const report = await syncAll({
        db,
        fetch: fakeFetch(responses()).fetch,
        now: at('2026-11-09T10:00:00Z'),
      });

      expect(report.newExpansions).toEqual([{ code: 'VEN', name: 'Vendetta', isPromo: false }]);
    });

    it('ne la signale qu’une fois', async () => {
      const db = await databaseBeforeVendetta();
      await syncAll({ db, fetch: fakeFetch(responses()).fetch, now: at('2026-11-09T10:00:00Z') });

      const report = await syncAll(
        { db, fetch: fakeFetch(responses()).fetch, now: at('2026-11-10T10:00:00Z') },
        { mode: 'refresh' },
      );

      expect(report.newExpansions).toEqual([]);
    });

    it('ne signale rien si le Catalogue n’a pas pu être mis à jour', async () => {
      const db = await databaseBeforeVendetta();

      const report = await syncAll({
        db,
        fetch: fakeFetch(responses([pageUrl(1)])).fetch,
        now: at('2026-11-09T10:00:00Z'),
      });

      expect(report.newExpansions).toEqual([]);
    });
  });
});
