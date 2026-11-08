import { createTestDatabase } from '@/data/testing/createTestDatabase';
import {
  collectionEntry,
  expansion,
  printing,
  setting,
  sourceState,
  wishlistEntry,
} from '@/data/schema';
import type { PrintingCode } from '@/domain/printingCode';
import page1 from '@/sources/rifthunt/__fixtures__/cards-page-1.json';
import page2 from '@/sources/rifthunt/__fixtures__/cards-page-2.json';
import sets from '@/sources/rifthunt/__fixtures__/sets.json';
import { fakeFetch } from '@/sources/testing/fakeFetch';

import { syncCatalog } from './catalog';

const SETS_URL = 'https://api.rifthunt.com/sets';
const pageUrl = (page: number) =>
  `https://api.rifthunt.com/cards/search?q=lang%3Aen&unique=prints&page=${page}`;
const rifthunt = {
  [SETS_URL]: { body: sets },
  [pageUrl(1)]: { body: page1 },
  [pageUrl(2)]: { body: page2 },
};

const at = (iso: string) => () => new Date(iso);

/** Base où le Catalogue a été téléchargé le 2026-11-08 à 10 h. */
async function syncedDatabase() {
  const { db } = await createTestDatabase();
  await syncCatalog({ db, fetch: fakeFetch(rifthunt).fetch, now: at('2026-11-08T10:00:00Z') });
  return db;
}

const pageRequests = (requests: { url: string }[]) =>
  requests.filter((r) => r.url.includes('/cards/search'));

describe('syncCatalog', () => {
  it('télécharge tout le Catalogue au premier lancement', async () => {
    const { db } = await createTestDatabase();
    const { fetch } = fakeFetch(rifthunt);
    const progress: number[] = [];

    const outcome = await syncCatalog(
      { db, fetch, now: at('2026-11-08T10:00:00Z') },
      { onProgress: (received) => progress.push(received) },
    );

    expect(outcome).toBe('refreshed');
    expect(progress).toEqual([4, 9]);
    expect(db.select().from(expansion).all()).toHaveLength(11);
    expect(db.select({ code: printing.printingCode }).from(printing).all()).toHaveLength(9);
  });

  it('ne contacte pas RiftHunt deux fois le même jour', async () => {
    const db = await syncedDatabase();
    const { fetch, requests } = fakeFetch(rifthunt);

    const outcome = await syncCatalog({ db, fetch, now: at('2026-11-08T20:00:00Z') });

    expect(outcome).toBe('skipped');
    expect(requests).toEqual([]);
  });

  it('vérifie /sets le lendemain, sans retélécharger un Catalogue inchangé', async () => {
    const db = await syncedDatabase();
    const { fetch, requests } = fakeFetch(rifthunt);

    const outcome = await syncCatalog({ db, fetch, now: at('2026-11-09T10:00:00Z') });

    expect(outcome).toBe('unchanged');
    expect(requests.map((r) => r.url)).toEqual([SETS_URL]);
  });

  it('retélécharge le Catalogue quand une Extension change de card_count', async () => {
    const db = await syncedDatabase();
    const grown = {
      ...sets,
      data: sets.data.map((s) => (s.code === 'ogn' ? { ...s, card_count: 353 } : s)),
    };
    const { fetch, requests } = fakeFetch({ ...rifthunt, [SETS_URL]: { body: grown } });

    const outcome = await syncCatalog({ db, fetch, now: at('2026-11-09T10:00:00Z') });

    expect(outcome).toBe('refreshed');
    expect(pageRequests(requests)).toHaveLength(2);
  });

  it('retélécharge le Catalogue après une semaine, même sans changement', async () => {
    const db = await syncedDatabase();
    const { fetch, requests } = fakeFetch(rifthunt);

    const outcome = await syncCatalog({ db, fetch, now: at('2026-11-15T10:00:00Z') });

    expect(outcome).toBe('refreshed');
    expect(pageRequests(requests)).toHaveLength(2);
  });

  it('garde le dernier Catalogue si le téléchargement échoue, et réessaie au prochain appel', async () => {
    const db = await syncedDatabase();
    const grown = {
      ...sets,
      data: sets.data.map((s) => (s.code === 'ogn' ? { ...s, card_count: 353 } : s)),
    };
    const failing = fakeFetch({
      ...rifthunt,
      [SETS_URL]: { body: grown },
      [pageUrl(2)]: new TypeError('Network request failed'),
    });

    await expect(
      syncCatalog({ db, fetch: failing.fetch, now: at('2026-11-09T10:00:00Z') }),
    ).rejects.toMatchObject({ kind: 'network' });

    expect(db.select().from(printing).all()).toHaveLength(9);
    expect(db.select().from(sourceState).all()).toContainEqual(
      expect.objectContaining({
        source: 'rifthunt-catalog',
        lastErrorAt: '2026-11-09T10:00:00.000Z',
        lastErrorMessage: 'Impossible de joindre api.rifthunt.com.',
      }),
    );

    const retry = fakeFetch(rifthunt);
    const outcome = await syncCatalog({ db, fetch: retry.fetch, now: at('2026-11-09T10:05:00Z') });
    expect(outcome).toBe('refreshed');
  });

  it('ne touche jamais aux Données précieuses, ni au lien Cardmarket', async () => {
    const db = await syncedDatabase();
    const code = (value: string) => value as PrintingCode;
    db.insert(collectionEntry)
      .values({ printingCode: code('OGN-255'), quantity: 3 })
      .run();
    db.insert(collectionEntry)
      .values({ printingCode: code('OGN-999'), quantity: 1 })
      .run();
    db.insert(wishlistEntry)
      .values({ printingCode: code('OPP-r04b'), addedAt: '2026-11-01T00:00:00Z' })
      .run();
    db.insert(setting).values({ key: 'theme', value: '"dark"' }).run();
    db.update(printing).set({ cardmarketProductId: 4242 }).run();
    const preciousBefore = {
      collection: db.select().from(collectionEntry).all(),
      wishlist: db.select().from(wishlistEntry).all(),
      settings: db.select().from(setting).all(),
    };
    const shrunk = { ...page2, total_cards: 5, data: page2.data.slice(0, 1) };
    const { fetch } = fakeFetch({ ...rifthunt, [pageUrl(2)]: { body: shrunk } });

    await syncCatalog({ db, fetch, now: at('2026-11-09T10:00:00Z') }, { force: true });

    expect({
      collection: db.select().from(collectionEntry).all(),
      wishlist: db.select().from(wishlistEntry).all(),
      settings: db.select().from(setting).all(),
    }).toEqual(preciousBefore);
    const printings = db.select().from(printing).all();
    expect(printings.map((p) => p.printingCode)).not.toContain('OGN-255');
    expect(printings).toHaveLength(5);
    expect(new Set(printings.map((p) => p.cardmarketProductId))).toEqual(new Set([4242]));
  });
});
