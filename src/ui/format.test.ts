import { formatIsoDate, formatPercentChange, formatPrice, parseAmount } from './format';

/** Espace insécable, et espace fine insécable (séparateur de milliers en français). */
const NBSP = '\u00a0';
const NNBSP = '\u202f';

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

describe('formatIsoDate', () => {
  it('écrit une date du calendrier en toutes lettres, sans décalage de fuseau', () => {
    expect(formatIsoDate('2026-11-10')).toBe('10 novembre 2026');
  });
});

describe('formatPercentChange', () => {
  it('signe toujours la variation, à une décimale', () => {
    expect(formatPercentChange(10)).toBe(`+10,0${NBSP}%`);
    expect(formatPercentChange(-3.46)).toBe(`−3,5${NBSP}%`);
    expect(formatPercentChange(0)).toBe(`0,0${NBSP}%`);
  });
});
