import type { NewExpansion } from '@/domain/catalog';

import { createAnnouncer } from './announcer';

const VENDETTA: NewExpansion = { code: 'VEN', name: 'Vendetta', isPromo: false };

function setup({ permission = true } = {}) {
  const notified: NewExpansion[][] = [];
  const shown: NewExpansion[][] = [];
  const announcer = createAnnouncer<NewExpansion>(async (expansions) => {
    if (permission) notified.push(expansions);
    return permission;
  });
  return { announcer, notified, shown, showInApp: () => announcer.subscribe((e) => shown.push(e)) };
}

describe('createAnnouncer', () => {
  it('affiche un message quand l’app est ouverte', async () => {
    const { announcer, notified, shown, showInApp } = setup();
    showInApp();

    expect(await announcer.announce([VENDETTA], { enabled: true, appIsActive: true })).toBe(true);

    expect(shown).toEqual([[VENDETTA]]);
    expect(notified).toEqual([]);
  });

  it('envoie une notification quand la détection a lieu en arrière-plan', async () => {
    const { announcer, notified, shown, showInApp } = setup();
    showInApp();

    expect(await announcer.announce([VENDETTA], { enabled: true, appIsActive: false })).toBe(true);

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

  it('dit que l’annonce n’a pas eu lieu quand Android refuse les notifications', async () => {
    const { announcer } = setup({ permission: false });

    expect(await announcer.announce([VENDETTA], { enabled: true, appIsActive: false })).toBe(false);
  });
});
