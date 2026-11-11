import { fakeFetch } from '@/sources/testing/fakeFetch';

import range from './__fixtures__/range.json';
import { fetchFrankfurterRates, frankfurterRangeUrl } from './frankfurter';

const URL_RANGE = frankfurterRangeUrl('2026-10-31', '2026-11-11');

describe('fetchFrankfurterRates', () => {
  it('donne les taux USD → CAD et USD → EUR de chaque jour ouvré de la plage', async () => {
    const { fetch, requests } = fakeFetch({ [URL_RANGE]: { body: range } });

    const rates = await fetchFrankfurterRates(fetch, '2026-10-31', '2026-11-11');

    expect(requests[0]?.url).toBe(
      'https://api.frankfurter.dev/v1/2026-10-31..2026-11-11?base=USD&symbols=EUR,CAD',
    );
    // Le samedi 31 est ramené au vendredi 30 par Frankfurter : 8 jours ouvrés.
    expect(rates).toHaveLength(16);
    expect(rates).toContainEqual({
      date: '2026-10-30',
      baseCurrency: 'USD',
      quoteCurrency: 'CAD',
      rate: 1.3969,
      source: 'frankfurter',
    });
    expect(rates).toContainEqual({
      date: '2026-11-10',
      baseCurrency: 'USD',
      quoteCurrency: 'EUR',
      rate: 0.89174,
      source: 'frankfurter',
    });
  });

  it('échoue clairement si le format change', async () => {
    const changed = { ...range, base: 'EUR' };
    const { fetch } = fakeFetch({ [URL_RANGE]: { body: changed } });

    await expect(fetchFrankfurterRates(fetch, '2026-10-31', '2026-11-11')).rejects.toMatchObject({
      kind: 'format',
    });
  });

  it('échoue clairement s’il manque une devise un jour', async () => {
    const changed = { ...range, rates: { ...range.rates, '2026-11-10': { CAD: 1.4136 } } };
    const { fetch } = fakeFetch({ [URL_RANGE]: { body: changed } });

    await expect(fetchFrankfurterRates(fetch, '2026-10-31', '2026-11-11')).rejects.toMatchObject({
      kind: 'format',
    });
  });
});
