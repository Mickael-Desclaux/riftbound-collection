import { SourceError } from '@/sources/http';
import { fakeFetch } from '@/sources/testing/fakeFetch';

import page1 from './__fixtures__/cards-page-1.json';
import page2 from './__fixtures__/cards-page-2.json';
import sets from './__fixtures__/sets.json';
import { fetchCatalog, fetchExpansions } from './rifthunt';

const SETS_URL = 'https://api.rifthunt.com/sets';
const pageUrl = (page: number) =>
  `https://api.rifthunt.com/cards/search?q=lang%3Aen&unique=prints&page=${page}`;
const catalogResponses = { [pageUrl(1)]: { body: page1 }, [pageUrl(2)]: { body: page2 } };

describe('fetchExpansions', () => {
  it('traduit /sets en Extensions, promo marquées', async () => {
    const { fetch } = fakeFetch({ [SETS_URL]: { body: sets } });

    const expansions = await fetchExpansions(fetch);

    expect(expansions).toHaveLength(11);
    expect(expansions).toContainEqual({
      code: 'OGN',
      name: 'Origins',
      releasedAt: '2025-10-31',
      isPromo: false,
      cardCount: 352,
    });
    expect(
      expansions
        .filter((e) => e.isPromo)
        .map((e) => e.code)
        .sort(),
    ).toEqual(['JDG', 'OGS', 'OPP', 'PR', 'RWB', 'SGN']);
  });

  it('s’identifie avec le User-Agent du projet', async () => {
    const { fetch, requests } = fakeFetch({ [SETS_URL]: { body: sets } });

    await fetchExpansions(fetch);

    expect(requests[0]?.headers['user-agent']).toMatch(/^RiftboundCollection\/.+github\.com/);
  });

  it('échoue clairement si le format change', async () => {
    const changed = { ...sets, data: [{ ...sets.data[0], card_count: '3' }] };
    const { fetch } = fakeFetch({ [SETS_URL]: { body: changed } });

    await expect(fetchExpansions(fetch)).rejects.toMatchObject({
      kind: 'format',
      message: 'Format inattendu dans la réponse de api.rifthunt.com.',
    });
  });

  it('distingue l’absence de réseau d’une erreur du serveur', async () => {
    const offline = fakeFetch({ [SETS_URL]: new TypeError('Network request failed') });
    const down = fakeFetch({ [SETS_URL]: { status: 503, body: {} } });

    await expect(fetchExpansions(offline.fetch)).rejects.toMatchObject({ kind: 'network' });
    await expect(fetchExpansions(down.fetch)).rejects.toBeInstanceOf(SourceError);
    await expect(fetchExpansions(down.fetch)).rejects.toMatchObject({ kind: 'http' });
  });
});

describe('fetchCatalog', () => {
  it('télécharge toutes les pages en signalant la progression', async () => {
    const { fetch, requests } = fakeFetch(catalogResponses);
    const progress: [number, number][] = [];

    const catalog = await fetchCatalog(fetch, (received, total) =>
      progress.push([received, total]),
    );

    expect(requests.map((r) => r.url)).toEqual([pageUrl(1), pageUrl(2)]);
    expect(progress).toEqual([
      [4, 9],
      [9, 9],
    ]);
    expect(catalog.printings.map((p) => p.printingCode)).toEqual([
      'OGN-030a',
      'OGN-303s',
      'OPP-017-024',
      'OPP-017-024-metal',
      'OPP-r04b',
      'OGN-271',
      'RAD-sp1',
      'OGN-303',
      'OGN-255',
    ]);
  });

  it('traduit les Versions et regroupe leurs Cartes', async () => {
    const { fetch } = fakeFetch(catalogResponses);

    const { cards, printings } = await fetchCatalog(fetch);
    const byCode = (code: string) => printings.find((p) => p.printingCode === code);

    expect(cards).toHaveLength(6);
    expect(cards.find((c) => c.name === 'Ahri, Nine-Tailed Fox')).toMatchObject({
      type: 'Legend',
      domains: ['calm', 'mind'],
    });
    expect(byCode('OPP-017-024-metal')).toMatchObject({ variant: 'metal', expansionCode: 'OPP' });
    expect(byCode('OGN-303s')).toMatchObject({ variant: 'signature', tcgId: 653102 });
    expect(byCode('OGN-271')).toMatchObject({ variant: 'normal', finishes: [], tcgId: null });
    expect(byCode('RAD-sp1')?.imageLarge).toMatch(/^https:\/\/images\.rifthunt\.com\//);
  });

  it('échoue clairement si une Version a une variante inconnue', async () => {
    const [first, ...rest] = page1.data;
    const changed = { ...page1, data: [{ ...first, variant: 'hologram' }, ...rest] };
    const { fetch } = fakeFetch({ ...catalogResponses, [pageUrl(1)]: { body: changed } });

    await expect(fetchCatalog(fetch)).rejects.toMatchObject({ kind: 'format' });
  });

  it('signale un riftbound_id inattendu comme une erreur de format', async () => {
    const [first, ...rest] = page1.data;
    const changed = { ...page1, data: [{ ...first, riftbound_id: 'xxx-030a-298' }, ...rest] };
    const { fetch } = fakeFetch({ ...catalogResponses, [pageUrl(1)]: { body: changed } });

    await expect(fetchCatalog(fetch)).rejects.toMatchObject({
      kind: 'format',
      message: 'Format inattendu dans le catalogue RiftHunt.',
    });
  });
});
