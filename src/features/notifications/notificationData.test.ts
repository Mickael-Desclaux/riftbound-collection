import { parseNotificationData } from './notificationData';

describe('parseNotificationData', () => {
  it('lit les Extensions d’une notification « Nouvelle extension »', () => {
    const data = {
      kind: 'newExpansions',
      expansions: [{ code: 'VEN', name: 'Vendetta', isPromo: false }],
    };

    expect(parseNotificationData(data)).toEqual(data);
  });

  it('ignore une forme inconnue', () => {
    expect(parseNotificationData({ kind: 'autre' })).toBeNull();
    expect(parseNotificationData({ kind: 'newExpansions', expansions: [] })).toBeNull();
    expect(parseNotificationData(undefined)).toBeNull();
  });
});
