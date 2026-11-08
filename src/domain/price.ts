/** Sources de prix, Finitions et devises reconnues par l'app. */

export const PRICE_SOURCES = ['tcgplayer', 'cardmarket'] as const;
export type PriceSource = (typeof PRICE_SOURCES)[number];

export type Finish = 'normal' | 'foil';

/** Devises des prix d'origine et des taux de change. */
export const CURRENCIES = ['CAD', 'USD', 'EUR'] as const;
export type Currency = (typeof CURRENCIES)[number];
