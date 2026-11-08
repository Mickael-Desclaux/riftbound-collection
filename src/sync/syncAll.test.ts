import { currentPrice } from '@/data/schema';
import { createTestDatabase } from '@/data/testing/createTestDatabase';
import prices from '@/sources/rifthunt/__fixtures__/prices.json';
import { RIFTHUNT_PRICES_URL } from '@/sources/rifthunt/prices';
import { rifthuntResponses, SETS_URL } from '@/sources/rifthunt/testing/rifthuntResponses';
import { fakeFetch } from '@/sources/testing/fakeFetch';

import { syncCatalog } from './catalog';
import { syncAll } from './syncAll';

const at = (iso: string) => () => new Date(iso);

describe('syncAll', () => {
  it('met à jour chaque source indépendamment : une panne n’empêche pas les autres', async () => {
    const { db } = await createTestDatabase();
    await syncCatalog({
      db,
      fetch: fakeFetch(rifthuntResponses).fetch,
      now: at('2026-11-08T10:00:00Z'),
    });
    const { fetch } = fakeFetch({
      [SETS_URL]: { status: 503 },
      [RIFTHUNT_PRICES_URL]: { body: prices },
    });

    const report = await syncAll({ db, fetch, now: at('2026-11-09T10:00:00Z') });

    expect(report.failures.map((f) => f.source)).toEqual(['catalog']);
    expect(db.select().from(currentPrice).all().length).toBeGreaterThan(0);
  });
});
