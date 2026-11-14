import type { PriceAlert } from '@/domain/priceAlert';
import type { PrintingCode } from '@/domain/printingCode';

import { priceAlertsText, priceAlertsTitle } from './priceAlertsText';

const alert = (cardName: string, change: number): PriceAlert => ({
  printingCode: `OGN-${cardName}` as PrintingCode,
  cardName,
  direction: change < 0 ? 'drop' : 'rise',
  source: 'tcgplayer',
  price: 1,
  change,
});

describe('priceAlertsText, baisses des souhaits', () => {
  it('annonce la baisse d’une carte', () => {
    const one = [alert('Jinx', -18.04)];

    expect(priceAlertsTitle('drop', one)).toBe('Alerte de prix');
    expect(priceAlertsText('drop', one)).toBe('Jinx a baissé de 18,0 %.');
  });

  it('regroupe plusieurs cartes en une seule annonce', () => {
    const three = [alert('Jinx', -20), alert('Ahri', -16), alert('Vi', -30)];

    expect(priceAlertsTitle('drop', three)).toBe('Alertes de prix');
    expect(priceAlertsText('drop', three)).toBe('3 cartes de tes souhaits ont baissé.');
  });
});

describe('priceAlertsText, hausses de la Collection', () => {
  it('annonce la hausse d’une carte', () => {
    const one = [alert('Jinx', 22.5)];

    expect(priceAlertsTitle('rise', one)).toBe('Hausse de prix');
    expect(priceAlertsText('rise', one)).toBe('Jinx a monté de 22,5 %.');
  });

  it('regroupe plusieurs cartes en une seule annonce', () => {
    const two = [alert('Jinx', 20), alert('Ahri', 16)];

    expect(priceAlertsTitle('rise', two)).toBe('Hausses de prix');
    expect(priceAlertsText('rise', two)).toBe('2 cartes de ta collection ont monté.');
  });
});
