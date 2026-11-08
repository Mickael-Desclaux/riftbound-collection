/** Sources de prix, Finitions et devises reconnues par l'app. */

export const PRICE_SOURCES = ['tcgplayer', 'cardmarket'] as const;
export type PriceSource = (typeof PRICE_SOURCES)[number];

export const FINISHES = ['normal', 'foil'] as const;
export type Finish = (typeof FINISHES)[number];

/** Devises d'affichage proposées, et devises des taux de change. */
export const CURRENCIES = ['CAD', 'USD', 'EUR'] as const;
export type Currency = (typeof CURRENCIES)[number];
export type DisplayCurrency = Currency;
