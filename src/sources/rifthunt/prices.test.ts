import { fakeFetch } from '@/sources/testing/fakeFetch';

import prices from './__fixtures__/prices.json';
import { fetchTcgplayerPrices, RIFTHUNT_PRICES_URL } from './prices';

describe('fetchTcgplayerPrices', () => {
  it('traduit /bulk/prices en prix par tcgId et par Finition', async () => {
    const { fetch } = fakeFetch({ [RIFTHUNT_PRICES_URL]: { body: prices } });

    const result = await fetchTcgplayerPrices(fetch);

    expect(result.modified).toBe(true);
    if (!result.modified) return;
    expect(result.data).toHaveLength(9);
    expect(result.data.find((p) => p.tcgId === 652771)).toEqual({
      tcgId: 652771,
      publishedAt: '2026-11-07T17:01:52.522Z',
      finishes: [
        {
          finish: 'normal',
          metrics: { low: 0.01, mid: 0.2, high: 15, market: 0.09, directLow: null },
        },
        {
          finish: 'foil',
          metrics: expect.objectContaining({ market: 0.21 }),
        },
      ],
    });
  });

  it('écarte une Finition sans aucun prix', async () => {
    const { fetch } = fakeFetch({ [RIFTHUNT_PRICES_URL]: { body: prices } });

    const result = await fetchTcgplayerPrices(fetch);

    if (!result.modified) throw new Error('attendu : modifié');
    const jinx = result.data.find((p) => p.tcgId === 652803);
    expect(jinx?.finishes.map((f) => f.finish)).toEqual(['foil']);
  });

  it('renvoie la date Last-Modified reçue, et ne retélécharge pas un fichier inchangé', async () => {
    const lastModified = 'Sun, 08 Nov 2026 15:10:21 GMT';
    const first = fakeFetch({
      [RIFTHUNT_PRICES_URL]: { body: prices, headers: { 'Last-Modified': lastModified } },
    });
    const second = fakeFetch({ [RIFTHUNT_PRICES_URL]: { status: 304 } });

    const downloaded = await fetchTcgplayerPrices(first.fetch);
    const unchanged = await fetchTcgplayerPrices(second.fetch, lastModified);

    expect(downloaded).toMatchObject({ modified: true, lastModified });
    expect(second.requests[0]?.headers['if-modified-since']).toBe(lastModified);
    expect(unchanged).toEqual({ modified: false });
  });

  it('échoue clairement si le format change', async () => {
    const changed = { ...prices, currency: 'EUR' };
    const { fetch } = fakeFetch({ [RIFTHUNT_PRICES_URL]: { body: changed } });

    await expect(fetchTcgplayerPrices(fetch)).rejects.toMatchObject({ kind: 'format' });
  });

  it('garde un indicateur inconnu, sans le perdre', async () => {
    const [first, ...rest] = prices.prices;
    const withNew = {
      ...prices,
      prices: [
        { ...first, finishes: { foil: { ...first?.finishes.foil, average: 199 } } },
        ...rest,
      ],
    };
    const { fetch } = fakeFetch({ [RIFTHUNT_PRICES_URL]: { body: withNew } });

    const result = await fetchTcgplayerPrices(fetch);

    if (!result.modified) throw new Error('attendu : modifié');
    expect(result.data[0]?.finishes[0]?.metrics).toMatchObject({ average: 199, market: 2.95 });
  });

  it('écrit toutes les dates au même format ISO, quelle que soit leur précision', async () => {
    const [first, ...rest] = prices.prices;
    const coarse = {
      ...prices,
      prices: [{ ...first, updatedAt: '2026-11-07T17:01:52Z' }, ...rest],
    };
    const { fetch } = fakeFetch({ [RIFTHUNT_PRICES_URL]: { body: coarse } });

    const result = await fetchTcgplayerPrices(fetch);

    if (!result.modified) throw new Error('attendu : modifié');
    expect(result.data[0]?.publishedAt).toBe('2026-11-07T17:01:52.000Z');
  });
});
