import { fakeFetch } from '@/sources/testing/fakeFetch';

import guide from './__fixtures__/price-guide.json';
import { CARDMARKET_PRICE_GUIDE_URL, fetchCardmarketPriceGuide } from './priceGuide';

async function download(body: unknown = guide) {
  const { fetch } = fakeFetch({ [CARDMARKET_PRICE_GUIDE_URL]: { body } });
  const result = await fetchCardmarketPriceGuide(fetch);
  if (!result.modified) throw new Error('attendu : modifié');
  return result.data;
}

describe('fetchCardmarketPriceGuide', () => {
  it('date les prix par le createdAt du fichier, en UTC', async () => {
    const data = await download();

    expect(data.publishedAt).toBe('2026-11-11T01:45:56.000Z');
  });

  it('sépare les indicateurs normaux et foil de chaque produit', async () => {
    const data = await download();

    expect(data.products.find((p) => p.idProduct === 847147)).toEqual({
      idProduct: 847147,
      finishes: {
        normal: { avg: null, low: 1.15, trend: 2.64, avg1: 1.4, avg7: 4, avg30: 4.12 },
        foil: { avg: 3.53, low: 1.15, trend: 3.52, avg1: 3.73, avg7: 3.66, avg30: 3.5 },
      },
    });
  });

  it('lit un indicateur à 0 comme absent : Cardmarket écrit 0 quand il n’a pas de prix', async () => {
    const data = await download();

    const ahri = data.products.find((p) => p.idProduct === 847508);
    expect(ahri?.finishes.normal.trend).toBeNull();
    expect(ahri?.finishes.foil?.trend).toBe(2572.24);
  });

  it('n’invente pas de prix foil pour un produit qui n’en publie pas', async () => {
    const data = await download();

    const withoutFoil = data.products.filter((p) => p.finishes.foil === undefined);
    expect(withoutFoil.length).toBeGreaterThan(0);
  });

  it('ne retélécharge pas un fichier inchangé', async () => {
    const lastModified = 'Wed, 11 Nov 2026 01:45:57 GMT';
    const { fetch, requests } = fakeFetch({ [CARDMARKET_PRICE_GUIDE_URL]: { status: 304 } });

    const result = await fetchCardmarketPriceGuide(fetch, lastModified);

    expect(result).toEqual({ modified: false });
    expect(requests[0]?.headers['if-modified-since']).toBe(lastModified);
  });

  it('échoue clairement si le format change', async () => {
    const { fetch } = fakeFetch({
      [CARDMARKET_PRICE_GUIDE_URL]: { body: { ...guide, createdAt: 'hier' } },
    });

    await expect(fetchCardmarketPriceGuide(fetch)).rejects.toMatchObject({ kind: 'format' });
  });
});
