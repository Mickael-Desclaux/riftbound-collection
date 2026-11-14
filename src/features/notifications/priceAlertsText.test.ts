import type { PrintingCode } from '@/domain/printingCode';

import { priceAlertsText, priceAlertsTitle } from './priceAlertsText';

const alert = (cardName: string, change: number) => ({
  printingCode: `OGN-${cardName}` as PrintingCode,
  cardName,
  change,
});

describe('priceAlertsText', () => {
  it('annonce la baisse d’une carte', () => {
    const one = [alert('Jinx', -18.04)];

    expect(priceAlertsTitle(one)).toBe('Alerte de prix');
    expect(priceAlertsText(one)).toBe('Jinx a baissé de 18,0\u00a0% depuis ton souhait.');
  });

  it('regroupe plusieurs cartes en une seule annonce', () => {
    const three = [alert('Jinx', -20), alert('Ahri', -16), alert('Vi', -30)];

    expect(priceAlertsTitle(three)).toBe('Alertes de prix');
    expect(priceAlertsText(three)).toBe('3 cartes de tes souhaits ont baissé.');
  });
});
