import { setting } from './schema';
import { getSetting, parseSetting, setSetting } from './settings';
import { createTestDatabase } from './testing/createTestDatabase';

describe('réglages', () => {
  it('donnent la valeur par défaut quand rien n’est enregistré', async () => {
    const { db } = await createTestDatabase();

    expect(getSetting(db, 'displayCurrency')).toBe('CAD');
    expect(getSetting(db, 'priceSource')).toBe('tcgplayer');
    expect(getSetting(db, 'theme')).toBe('system');
    expect(getSetting(db, 'chartPeriod')).toBe('30d');
    expect(getSetting(db, 'priceAlertThreshold')).toBe(15);
  });

  it('relisent la dernière valeur enregistrée', async () => {
    const { db } = await createTestDatabase();

    setSetting(db, 'displayCurrency', 'EUR');
    setSetting(db, 'displayCurrency', 'USD');
    setSetting(db, 'priceAlertThreshold', 20);

    expect(getSetting(db, 'displayCurrency')).toBe('USD');
    expect(getSetting(db, 'priceAlertThreshold')).toBe(20);
    expect(db.select().from(setting).all()).toHaveLength(2);
  });

  it('refusent d’enregistrer une valeur non permise', async () => {
    const { db } = await createTestDatabase();

    expect(() => setSetting(db, 'priceAlertThreshold', -5)).toThrow(/priceAlertThreshold/);
    expect(getSetting(db, 'priceAlertThreshold')).toBe(15);
  });

  it('retombent sur la valeur par défaut si la valeur stockée n’est plus valable', async () => {
    const { db } = await createTestDatabase();
    db.insert(setting).values({ key: 'theme', value: '"sepia"' }).run();

    expect(getSetting(db, 'theme')).toBe('system');
  });

  it('ignorent une valeur stockée illisible', () => {
    expect(parseSetting('chartPeriod', '{pas du json')).toBe('30d');
    expect(parseSetting('chartPeriod', '"90d"')).toBe('90d');
  });
});
