import { isValidSetting, parseSetting } from './settings';

describe('parseSetting', () => {
  it('donne la valeur par défaut quand rien n’est enregistré', () => {
    expect(parseSetting('displayCurrency', undefined)).toBe('CAD');
    expect(parseSetting('priceSource', undefined)).toBe('tcgplayer');
    expect(parseSetting('theme', undefined)).toBe('system');
    expect(parseSetting('chartPeriod', undefined)).toBe('30d');
    expect(parseSetting('newExpansionNotifications', undefined)).toBe(true);
    expect(parseSetting('priceAlertNotifications', undefined)).toBe(true);
    expect(parseSetting('priceAlertThreshold', undefined)).toBe(15);
  });

  it('relit une valeur enregistrée en JSON', () => {
    expect(parseSetting('chartPeriod', '"90d"')).toBe('90d');
    expect(parseSetting('priceAlertNotifications', 'false')).toBe(false);
  });

  it('retombe sur la valeur par défaut si la valeur n’est plus permise', () => {
    expect(parseSetting('theme', '"sepia"')).toBe('system');
    expect(parseSetting('priceAlertThreshold', '0')).toBe(15);
  });

  it('ignore une valeur illisible', () => {
    expect(parseSetting('chartPeriod', '{pas du json')).toBe('30d');
  });
});

describe('période « Dates… » du graphique', () => {
  it('retient un intervalle de dates', () => {
    const range = { from: '2026-01-01', to: '2026-03-31' };

    expect(parseSetting('chartPeriod', JSON.stringify(range))).toEqual(range);
  });

  it.each([
    { from: '2026-03-31', to: '2026-01-01' },
    { from: '2026-02-30x', to: '2026-03-01' },
    { from: '2026-01-01' },
  ])('refuse un intervalle invalide : %j', (range) => {
    expect(isValidSetting('chartPeriod', range)).toBe(false);
  });
});
