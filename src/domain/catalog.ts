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

/** Une Extension apparue dans le Catalogue, telle qu'on l'annonce (spec § 5). */
export type NewExpansion = Pick<Expansion, 'code' | 'name' | 'isPromo'>;

type ExpansionSize = Pick<Expansion, 'code' | 'cardCount'>;

/**
 * Les Extensions de `latest` qui viennent d'apparaître (spec § 5 : nouvelle
 * Extension). Une Extension n'apparaît qu'avec ses premières cartes : annoncée
 * vide, elle ouvrirait un Catalogue vide. Au premier téléchargement, rien
 * n'est signalé.
 */
export function newExpansions<T extends ExpansionSize>(
  stored: readonly ExpansionSize[],
  latest: readonly T[],
): T[] {
  if (stored.length === 0) return [];
  const known = new Set(stored.filter((e) => e.cardCount > 0).map((e) => e.code));
  return latest.filter((e) => e.cardCount > 0 && !known.has(e.code));
}

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

/** `tcgId` → `idProduct` Cardmarket, pour chaque produit TCGplayer qu'OpenRift sait relier. */
export type CardmarketLinks = ReadonlyMap<number, number>;
