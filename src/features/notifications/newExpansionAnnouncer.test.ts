import type { NewExpansion } from '@/domain/catalog';

import { createNewExpansionAnnouncer } from './newExpansionAnnouncer';

const VENDETTA: NewExpansion = { code: 'VEN', name: 'Vendetta', isPromo: false };

function setup() {
  const notified: NewExpansion[][] = [];
  const shown: NewExpansion[][] = [];
  const announcer = createNewExpansionAnnouncer(async (expansions) => {
    notified.push(expansions);
  });
  return { announcer, notified, shown, showInApp: () => announcer.subscribe((e) => shown.push(e)) };
}

describe('createNewExpansionAnnouncer', () => {
  it('affiche un message quand l’app est ouverte', async () => {
    const { announcer, notified, shown, showInApp } = setup();
    showInApp();

    await announcer.announce([VENDETTA], { enabled: true, appIsActive: true });

    expect(shown).toEqual([[VENDETTA]]);
    expect(notified).toEqual([]);
  });

  it('envoie une notification quand la détection a lieu en arrière-plan', async () => {
    const { announcer, notified, shown, showInApp } = setup();
    showInApp();

    await announcer.announce([VENDETTA], { enabled: true, appIsActive: false });

    expect(notified).toEqual([[VENDETTA]]);
    expect(shown).toEqual([]);
  });

  it('envoie une notification si aucun écran ne peut afficher le message', async () => {
    const { announcer, notified } = setup();

    await announcer.announce([VENDETTA], { enabled: true, appIsActive: true });

    expect(notified).toEqual([[VENDETTA]]);
  });

  it('se tait quand le réglage « Nouvelles extensions » est coupé, ou sans nouveauté', async () => {
    const { announcer, notified, shown, showInApp } = setup();
    showInApp();

    await announcer.announce([VENDETTA], { enabled: false, appIsActive: false });
    await announcer.announce([], { enabled: true, appIsActive: true });

    expect(notified).toEqual([]);
    expect(shown).toEqual([]);
  });
});
