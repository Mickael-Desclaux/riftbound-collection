import { rateOnOrBefore, type ExchangeRate } from './exchangeRates';

const usd = (date: string, quoteCurrency: 'CAD' | 'EUR', rate: number): ExchangeRate => ({
  date,
  baseCurrency: 'USD',
  quoteCurrency,
  rate,
  source: 'frankfurter',
});

/** Taux BCE réels via Frankfurter, du vendredi 2026-11-06 au mardi 2026-11-10. */
const rates = [
  usd('2026-11-06', 'CAD', 1.4066),
  usd('2026-11-06', 'EUR', 0.89566),
  usd('2026-11-09', 'CAD', 1.4103),
  usd('2026-11-09', 'EUR', 0.89342),
  usd('2026-11-10', 'CAD', 1.4136),
  usd('2026-11-10', 'EUR', 0.89174),
];

describe('rateOnOrBefore', () => {
  it('donne le taux du jour quand il existe', () => {
    expect(rateOnOrBefore(rates, 'USD', 'CAD', '2026-11-09')).toEqual({
      rate: 1.4103,
      date: '2026-11-09',
    });
  });

  it('un week-end ou un jour férié prend le dernier taux qui précède', () => {
    expect(rateOnOrBefore(rates, 'USD', 'CAD', '2026-11-08')).toEqual({
      rate: 1.4066,
      date: '2026-11-06',
    });
  });

  it('passe les jours fériés de la BCE (Noël et lendemain de Noël)', () => {
    // Taux BCE réels : aucune cotation du 25 au 28 décembre 2025.
    const christmas = [usd('2025-12-24', 'CAD', 1.3683), usd('2025-12-29', 'CAD', 1.3689)];
    expect(rateOnOrBefore(christmas, 'USD', 'CAD', '2025-12-26')).toEqual({
      rate: 1.3683,
      date: '2025-12-24',
    });
  });

  it('ne donne rien avant le premier taux connu', () => {
    expect(rateOnOrBefore(rates, 'USD', 'CAD', '2026-11-05')).toBeUndefined();
  });

  it('après le dernier taux connu, garde le dernier', () => {
    expect(rateOnOrBefore(rates, 'USD', 'EUR', '2026-12-25')).toEqual({
      rate: 0.89174,
      date: '2026-11-10',
    });
  });

  it('une devise vers elle-même ne demande aucun taux', () => {
    expect(rateOnOrBefore([], 'EUR', 'EUR', '2026-11-09')).toEqual({ rate: 1, date: null });
  });

  it('se sert de la paire inverse', () => {
    // BCE, base EUR, 2026-11-09 : 1 EUR = 1,1193 USD.
    const result = rateOnOrBefore(rates, 'EUR', 'USD', '2026-11-09');
    expect(result?.rate).toBeCloseTo(1.1193, 4);
    expect(result?.date).toBe('2026-11-09');
  });

  it('croise deux paires de même base (EUR → CAD via l’USD)', () => {
    // BCE, base EUR, 2026-11-09 : 1 EUR = 1,5785 CAD.
    const result = rateOnOrBefore(rates, 'EUR', 'CAD', '2026-11-09');
    expect(result?.rate).toBeCloseTo(1.5785, 4);
    expect(result?.date).toBe('2026-11-09');
  });

  it('pour une paire croisée, garde la date la plus ancienne des deux taux', () => {
    const cadOnlyOnMonday = rates.filter(
      (r) => !(r.date === '2026-11-09' && r.quoteCurrency === 'EUR'),
    );
    expect(rateOnOrBefore(cadOnlyOnMonday, 'EUR', 'CAD', '2026-11-09')?.date).toBe('2026-11-06');
  });

  it('ne donne rien sans taux pour l’une des deux devises', () => {
    const cadOnly = rates.filter((r) => r.quoteCurrency === 'CAD');
    expect(rateOnOrBefore(cadOnly, 'EUR', 'CAD', '2026-11-09')).toBeUndefined();
  });
});
