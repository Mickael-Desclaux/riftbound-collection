import { setting } from './schema';
import { getSetting, setSetting } from './settings';
import { createTestDatabase } from './testing/createTestDatabase';

describe('réglages en base', () => {
  it('donnent la valeur par défaut quand rien n’est enregistré', async () => {
    const { db } = await createTestDatabase();

    expect(getSetting(db, 'displayCurrency')).toBe('CAD');
  });

  it('relisent la dernière valeur enregistrée', async () => {
    const { db } = await createTestDatabase();

    setSetting(db, 'displayCurrency', 'EUR');
    setSetting(db, 'displayCurrency', 'USD');
    setSetting(db, 'chartPeriod', { from: '2026-01-01', to: '2026-02-01' });

    expect(getSetting(db, 'displayCurrency')).toBe('USD');
    expect(getSetting(db, 'chartPeriod')).toEqual({ from: '2026-01-01', to: '2026-02-01' });
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
});
