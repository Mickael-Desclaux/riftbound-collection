import { fakeFetch } from '@/sources/testing/fakeFetch';

import links from './__fixtures__/links.json';
import { fetchCardmarketLinks, OPENRIFT_LINKS_URL } from './links';

describe('fetchCardmarketLinks', () => {
  it('relie chaque tcgId à l’idProduct Cardmarket de la même Version', async () => {
    const { fetch } = fakeFetch({ [OPENRIFT_LINKS_URL]: { body: links } });

    const result = await fetchCardmarketLinks(fetch);

    expect(result.get(652803)).toBe(847147);
    expect(result.get(652916)).toBe(847289);
    // Annie (Metal) n'a pas de produit Cardmarket : aucune correspondance.
    expect(result.has(669265)).toBe(false);
    expect(result.size).toBe(5);
  });

  it('échoue clairement si une Version reçoit deux produits Cardmarket différents', async () => {
    const [first] = Object.values(links.links);
    const conflicting = {
      links: {
        ...links.links,
        autre: { ...first, cardmarket: { ...first?.cardmarket, productId: 1 } },
      },
    };
    const { fetch } = fakeFetch({ [OPENRIFT_LINKS_URL]: { body: conflicting } });

    await expect(fetchCardmarketLinks(fetch)).rejects.toMatchObject({ kind: 'format' });
  });

  it('échoue clairement si le format change', async () => {
    const { fetch } = fakeFetch({ [OPENRIFT_LINKS_URL]: { body: { data: [] } } });

    await expect(fetchCardmarketLinks(fetch)).rejects.toMatchObject({ kind: 'format' });
  });
});
