import { addDays, localIsoDate, toIsoDate } from './dates';

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

describe('localIsoDate', () => {
  it("donne le jour à l'heure du téléphone, même tard le soir", () => {
    expect(localIsoDate(new Date(2026, 10, 5, 23, 30))).toBe('2026-11-05');
  });
});
