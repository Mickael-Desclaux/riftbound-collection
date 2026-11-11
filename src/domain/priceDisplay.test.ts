import type { ExchangeRate } from './exchangeRates';
import {
  arePricesStale,
  convertCurrentPrice,
  convertRecordedPrice,
  formatPrice,
  parseAmount,
  referenceFinish,
  referencePrice,
} from './priceDisplay';

/** Espace insécable, et espace fine insécable (séparateur de milliers en français). */
const NBSP = '\u00a0';
const NNBSP = '\u202f';

describe('referenceFinish', () => {
  it('prend la Finition normale quand elle existe', () => {
    expect(referenceFinish(['foil', 'normal'])).toBe('normal');
  });

  it('prend la foil quand la Version n’existe qu’en foil', () => {
    expect(referenceFinish(['foil'])).toBe('foil');
  });

  it('ne donne rien pour une Version sans Finition connue', () => {
    expect(referenceFinish([])).toBeUndefined();
  });
});

describe('formatPrice', () => {
  it('écrit le montant à la française, avec la devise toujours explicite', () => {
    expect(formatPrice(12.4, 'CAD')).toBe(`12,40${NBSP}$${NBSP}CA`);
    expect(formatPrice(12.4, 'USD')).toBe(`12,40${NBSP}$${NBSP}US`);
    expect(formatPrice(12.4, 'EUR')).toBe(`12,40${NBSP}€`);
  });

  it('arrondit au centime et sépare les milliers', () => {
    expect(formatPrice(1234.567, 'EUR')).toBe(`1${NNBSP}234,57${NBSP}€`);
    expect(formatPrice(0.004, 'USD')).toBe(`0,00${NBSP}$${NBSP}US`);
  });

  it('affiche « — » pour un prix absent', () => {
    expect(formatPrice(null, 'CAD')).toBe('—');
  });
});

/** Taux BCE réels (Frankfurter), du vendredi 2026-11-06 au mardi 2026-11-10. */
const rates: ExchangeRate[] = [
  ['2026-11-06', 'CAD', 1.4066],
  ['2026-11-06', 'EUR', 0.89566],
  ['2026-11-09', 'CAD', 1.4103],
  ['2026-11-09', 'EUR', 0.89342],
  ['2026-11-10', 'CAD', 1.4136],
  ['2026-11-10', 'EUR', 0.89174],
].map(([date, quoteCurrency, rate]) => ({
  date: date as string,
  baseCurrency: 'USD',
  quoteCurrency: quoteCurrency as 'CAD' | 'EUR',
  rate: rate as number,
  source: 'frankfurter',
}));

describe('convertCurrentPrice', () => {
  it('convertit au dernier taux connu', () => {
    expect(convertCurrentPrice(10, 'USD', 'CAD', rates)).toBeCloseTo(14.136, 6);
  });

  it('laisse un prix déjà dans la Devise d’affichage tel quel, même sans taux', () => {
    expect(convertCurrentPrice(10, 'EUR', 'EUR', [])).toBe(10);
  });

  it('ne donne rien sans taux, ou sans prix', () => {
    expect(convertCurrentPrice(10, 'USD', 'CAD', [])).toBeNull();
    expect(convertCurrentPrice(null, 'USD', 'CAD', rates)).toBeNull();
  });
});

describe('convertRecordedPrice', () => {
  it('convertit un relevé au taux de son jour (UTC)', () => {
    // Dimanche 8 : le taux du vendredi 6.
    expect(convertRecordedPrice(10, 'USD', 'CAD', rates, '2026-11-08T17:00:00.000Z')).toBeCloseTo(
      14.066,
      6,
    );
    // Le 9 à 2 h UTC (le 8 au soir à Montréal) : le taux du 9.
    expect(convertRecordedPrice(10, 'USD', 'CAD', rates, '2026-11-09T02:00:00.000Z')).toBeCloseTo(
      14.103,
      6,
    );
  });

  it('ne donne rien pour un relevé antérieur à tout taux connu', () => {
    expect(convertRecordedPrice(10, 'USD', 'CAD', rates, '2026-11-05T12:00:00.000Z')).toBeNull();
  });
});

describe('referencePrice', () => {
  const usd = (value: number | null) => ({ value, currency: 'USD' as const });

  it('donne le prix de la Finition de référence, dans la Devise d’affichage', () => {
    const prices = { normal: usd(10), foil: usd(30) };
    expect(referencePrice(['normal', 'foil'], prices, 'CAD', rates)).toBeCloseTo(14.136, 6);
  });

  it('prend la foil pour une Version qui n’existe qu’en foil', () => {
    expect(referencePrice(['foil'], { foil: usd(30) }, 'USD', rates)).toBe(30);
  });

  it('ne se replie jamais sur l’autre Finition : sans prix normal, « — »', () => {
    expect(referencePrice(['normal', 'foil'], { foil: usd(30) }, 'USD', rates)).toBeNull();
    expect(
      referencePrice(['normal', 'foil'], { normal: usd(null), foil: usd(30) }, 'USD', rates),
    ).toBeNull();
  });

  it('ne donne rien pour une Version sans prix ni Finition', () => {
    expect(referencePrice(['normal'], undefined, 'USD', rates)).toBeNull();
    expect(referencePrice([], { foil: usd(30) }, 'USD', rates)).toBeNull();
  });
});

describe('arePricesStale', () => {
  const publishedAt = '2026-11-08T17:00:00.000Z';

  it('signale des prix publiés il y a plus de 48 h', () => {
    expect(arePricesStale(publishedAt, new Date('2026-11-10T17:00:01Z'))).toBe(true);
  });

  it('ne signale rien jusqu’à 48 h', () => {
    expect(arePricesStale(publishedAt, new Date('2026-11-10T17:00:00Z'))).toBe(false);
  });

  it('ne signale rien tant qu’aucun prix n’est connu', () => {
    expect(arePricesStale(undefined, new Date('2026-11-10T17:00:00Z'))).toBe(false);
  });
});

describe('parseAmount', () => {
  it('lit un montant saisi à la française ou à l’anglaise', () => {
    expect(parseAmount('12,5')).toBe(12.5);
    expect(parseAmount(' 12.50 ')).toBe(12.5);
    expect(parseAmount('3')).toBe(3);
    // En cours de saisie : « 12, » avant « 12,5 ».
    expect(parseAmount('12,')).toBe(12);
  });

  it('ne donne rien pour une saisie vide ou illisible', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('12,5,3')).toBeNull();
    expect(parseAmount('-2')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
  });
});
