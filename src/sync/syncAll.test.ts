import { eq } from 'drizzle-orm';

import { currentPrice, exchangeRate } from '@/data/schema';
import { createTestDatabase } from '@/data/testing/createTestDatabase';
import guide from '@/sources/cardmarket/__fixtures__/price-guide.json';
import { CARDMARKET_PRICE_GUIDE_URL } from '@/sources/cardmarket/priceGuide';
import links from '@/sources/openrift/__fixtures__/links.json';
import { OPENRIFT_LINKS_URL } from '@/sources/openrift/links';
import prices from '@/sources/rifthunt/__fixtures__/prices.json';
import range from '@/sources/frankfurter/__fixtures__/range.json';
import { frankfurterRangeUrl } from '@/sources/frankfurter/frankfurter';
import { RIFTHUNT_PRICES_URL } from '@/sources/rifthunt/prices';
import { rifthuntResponses, SETS_URL } from '@/sources/rifthunt/testing/rifthuntResponses';
import { fakeFetch } from '@/sources/testing/fakeFetch';

import { syncCatalog } from './catalog';
import { syncAll } from './syncAll';

const at = (iso: string) => () => new Date(iso);

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
    [SETS_URL]: rifthuntResponses[SETS_URL],
    [OPENRIFT_LINKS_URL]: { body: links },
    [RIFTHUNT_PRICES_URL]: { body: prices },
    [CARDMARKET_PRICE_GUIDE_URL]: { body: guide },
    [frankfurterRangeUrl('2026-11-06', '2026-11-09')]: { body: range },
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

    expect(report.failures.map((f) => f.source)).toEqual(['catalog']);
    expect(db.select().from(currentPrice).all().length).toBeGreaterThan(0);
    expect(db.select().from(exchangeRate).all().length).toBeGreaterThan(0);
  });

  it('une panne Cardmarket n’empêche pas les prix TCGplayer', async () => {
    const db = await catalogDatabase();
    const { fetch } = fakeFetch(responses([CARDMARKET_PRICE_GUIDE_URL]));

    const report = await syncAll({ db, fetch, now: at('2026-11-09T10:00:00Z') });

    expect(report.failures.map((f) => f.source)).toEqual(['cardmarketPrices']);
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
});
