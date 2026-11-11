import { fakeFetch } from '@/sources/testing/fakeFetch';

import observations from './__fixtures__/observations.json';
import { bankOfCanadaUrl, fetchBankOfCanadaRates } from './bankOfCanada';

// Plage demandée du 2026-11-03 au 2026-11-11 : la requête part 10 jours plus tôt.
const URL_RANGE = bankOfCanadaUrl('2026-10-24', '2026-11-11');

describe('fetchBankOfCanadaRates', () => {
  it('donne USD → CAD tel quel et USD → EUR croisé par le CAD', async () => {
    const { fetch, requests } = fakeFetch({ [URL_RANGE]: { body: observations } });

    const rates = await fetchBankOfCanadaRates(fetch, '2026-11-03', '2026-11-11');

    expect(requests[0]?.url).toBe(
      'https://www.bankofcanada.ca/valet/observations/FXUSDCAD,FXEURCAD/json?start_date=2026-10-24&end_date=2026-11-11',
    );
    expect(rates).toContainEqual({
      date: '2026-11-06',
      baseCurrency: 'USD',
      quoteCurrency: 'CAD',
      rate: 1.4113,
      source: 'bank-of-canada',
    });
    // 1 USD = 1,4113 CAD et 1 EUR = 1,5732 CAD, donc 1 USD = 0,89709 EUR.
    const eur = rates.find((r) => r.date === '2026-11-06' && r.quoteCurrency === 'EUR');
    expect(eur?.rate).toBeCloseTo(0.89709, 5);
    expect(eur?.source).toBe('bank-of-canada');
  });

  it('remonte avant le début de la plage, pour avoir le taux d’un début de week-end', async () => {
    const { fetch } = fakeFetch({
      [bankOfCanadaUrl('2026-10-22', '2026-11-11')]: { body: observations },
    });

    const rates = await fetchBankOfCanadaRates(fetch, '2026-11-01', '2026-11-11');

    expect(rates.map((r) => r.date)).toContain('2026-10-30');
  });

  it('échoue clairement si le format change', async () => {
    const [first, ...rest] = observations.observations;
    const changed = {
      ...observations,
      observations: [{ d: first?.d, FXUSDCAD: first?.FXUSDCAD }, ...rest],
    };
    const { fetch } = fakeFetch({ [URL_RANGE]: { body: changed } });

    await expect(fetchBankOfCanadaRates(fetch, '2026-11-03', '2026-11-11')).rejects.toMatchObject({
      kind: 'format',
    });
  });
});
