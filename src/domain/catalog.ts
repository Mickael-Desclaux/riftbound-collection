/** Le Catalogue, tel que l'app le manipule, quelle que soit la source. */
import type { IsoDate } from './dates';
import type { Finish } from './price';
import { editionOf, type PrintingCode } from './printingCode';

/** Extensions promo, masquées par défaut dans le Catalogue (spec § 1). */
const PROMO_EXPANSIONS = new Set(['OPP', 'PR', 'JDG', 'OGS', 'SGN', 'RWB']);

export function isPromoExpansion(expansionCode: string): boolean {
  return PROMO_EXPANSIONS.has(expansionCode.toUpperCase());
}

export type Expansion = {
  /** Code en majuscules, ex. `OGN`. */
  code: string;
  name: string;
  releasedAt: IsoDate | null;
  isPromo: boolean;
  /** Nombre de Versions annoncé par la source. */
  cardCount: number;
};

export type Card = {
  oracleId: string;
  name: string;
  type: string;
  subtype: string | null;
  domains: string[];
  text: string | null;
};

/** Le critère « version » des filtres (spec § 2.1). */
export type PrintingVariant =
  'normal' | 'alternate' | 'overnumbered' | 'signature' | 'showcase' | 'metal';

/**
 * Le critère « version » d'une Version. Les Versions Metal ne sont signalées
 * que par leur nom (« … (Metal) ») ; les autres variantes viennent de la source.
 */
export function printingVariantOf(
  name: string,
  sourceVariant: Exclude<PrintingVariant, 'normal' | 'metal'> | null,
): PrintingVariant {
  if (editionOf(name) === 'metal') return 'metal';
  return sourceVariant ?? 'normal';
}

export type Printing = {
  printingCode: PrintingCode;
  cardOracleId: string;
  expansionCode: string;
  collectorNumber: string;
  rarity: string;
  variant: PrintingVariant;
  finishes: Finish[];
  imageSmall: string | null;
  imageNormal: string | null;
  imageLarge: string | null;
  artist: string | null;
  rifthuntPrintingId: string;
  tcgId: number | null;
};

/** Le Catalogue complet, tel que téléchargé. */
export type Catalog = {
  expansions: Expansion[];
  cards: Card[];
  printings: Printing[];
};
