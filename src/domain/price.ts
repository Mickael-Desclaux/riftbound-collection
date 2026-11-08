/** Sources de prix, Finitions et devises reconnues par l'app. */

export const PRICE_SOURCES = ['tcgplayer', 'cardmarket'] as const;
export type PriceSource = (typeof PRICE_SOURCES)[number];

/** Indicateur de référence de chaque Source de prix (spec § 3). */
export const REFERENCE_METRIC: Record<PriceSource, string> = {
  tcgplayer: 'market',
  cardmarket: 'trend',
};

/** Finitions, normale d'abord (c'est la Finition de référence quand elle existe). */
export const FINISHES = ['normal', 'foil'] as const;
export type Finish = (typeof FINISHES)[number];

/** Devises des prix d'origine et des taux de change. */
export const CURRENCIES = ['CAD', 'USD', 'EUR'] as const;
export type Currency = (typeof CURRENCIES)[number];
