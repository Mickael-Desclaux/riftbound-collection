import type { ExchangeRate } from './exchangeRates';
import { defaultCell, priceCells, productUrl, type DetailPrices } from './printingDetail';

const rates: ExchangeRate[] = [
  {
    date: '2026-11-10',
    baseCurrency: 'USD',
    quoteCurrency: 'CAD',
    rate: 1.4136,
    source: 'frankfurter',
  },
  {
    date: '2026-11-10',
    baseCurrency: 'USD',
    quoteCurrency: 'EUR',
    rate: 0.89174,
    source: 'frankfurter',
  },
];

const prices: DetailPrices = {
  tcgplayer: {
    normal: { value: 10, currency: 'USD', publishedAt: '2026-11-10T17:00:00.000Z' },
    foil: { value: 30, currency: 'USD', publishedAt: '2026-11-10T17:00:00.000Z' },
  },
  cardmarket: {
    foil: { value: 20, currency: 'EUR', publishedAt: '2026-11-11T01:45:56.000Z' },
  },
};

describe('priceCells', () => {
  it('donne une case par Source de prix × Finition existante, même sans prix', () => {
    const cells = priceCells(['normal', 'foil'], prices, 'CAD', rates);

    expect(cells.map((c) => [c.source, c.finish])).toEqual([
      ['tcgplayer', 'normal'],
      ['tcgplayer', 'foil'],
      ['cardmarket', 'normal'],
      ['cardmarket', 'foil'],
    ]);
    expect(cells[2]).toMatchObject({ original: null, converted: null, publishedAt: null });
  });

  it('donne le prix converti, le prix d’origine, la date du relevé et celle du taux', () => {
    const [tcgNormal] = priceCells(['normal'], prices, 'CAD', rates);

    expect(tcgNormal).toEqual({
      source: 'tcgplayer',
      finish: 'normal',
      original: 10,
      currency: 'USD',
      converted: expect.closeTo(14.136, 6),
      publishedAt: '2026-11-10T17:00:00.000Z',
      rateDate: '2026-11-10',
    });
  });

  it('ne cite aucun taux pour un prix déjà dans la Devise d’affichage', () => {
    const cells = priceCells(['foil'], prices, 'EUR', rates);

    expect(cells.find((c) => c.source === 'cardmarket')).toMatchObject({
      converted: 20,
      rateDate: null,
    });
  });

  it('ignore les Finitions dans lesquelles la Version n’existe pas', () => {
    expect(priceCells(['foil'], prices, 'CAD', rates).map((c) => c.finish)).toEqual([
      'foil',
      'foil',
    ]);
  });
});

describe('defaultCell', () => {
  it('choisit la Source de prix des Réglages et la Finition de référence', () => {
    expect(defaultCell(['normal', 'foil'], 'cardmarket')).toEqual({
      source: 'cardmarket',
      finish: 'normal',
    });
    expect(defaultCell(['foil'], 'tcgplayer')).toEqual({ source: 'tcgplayer', finish: 'foil' });
  });

  it('ne choisit rien pour une Version sans Finition connue', () => {
    expect(defaultCell([], 'tcgplayer')).toBeUndefined();
  });
});

describe('productUrl', () => {
  const ids = { tcgId: 652803, cardmarketProductId: 847147 };

  it('ouvre la page produit de la Source de prix', () => {
    expect(productUrl('tcgplayer', ids)).toBe('https://www.tcgplayer.com/product/652803');
    expect(productUrl('cardmarket', ids)).toBe(
      'https://www.cardmarket.com/en/Riftbound/Products?idProduct=847147',
    );
  });

  it('ne donne rien sans identifiant produit pour cette source', () => {
    expect(productUrl('cardmarket', { tcgId: 652803, cardmarketProductId: null })).toBeNull();
  });
});
