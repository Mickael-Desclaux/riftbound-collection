import { addDays, toIsoDate } from './dates';

describe('toIsoDate', () => {
  it('donne la date UTC d’un instant', () => {
    expect(toIsoDate(new Date('2026-11-08T23:30:00-05:00'))).toBe('2026-11-09');
  });
});

describe('addDays', () => {
  it('avance ou recule d’un nombre de jours, en passant les fins de mois', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-03-01', -10)).toBe('2026-02-19');
  });
});
