import { isPromoExpansion, type PrintingVariant } from './catalog';
import type { IsoDateTime } from './dates';
import { latestRatePerPair, type ExchangeRate } from './exchangeRates';
import type { Currency, Finish } from './price';
import { referenceFinish, referencePrice, type FinishPrices } from './priceDisplay';
import { percentChange } from './priceHistory';
import { printingFinishKey } from './priceRecords';
import { expansionCodeOf, type PrintingCode } from './printingCode';

/** Une Version telle que les grilles la filtrent, la trient et l'affichent. */
export type CatalogEntry = {
  printingCode: PrintingCode;
  /** Nom de la Carte. */
  name: string;
  expansionCode: string;
  /** Rang de l'Extension dans l'ordre de sortie (0 = la plus ancienne). */
  expansionRank: number;
  isPromo: boolean;
  collectorNumber: string;
  rarity: string;
  variant: PrintingVariant;
  type: string;
  domains: string[];
  /** Faux pour une Version inconnue : possédée, mais absente du Catalogue. */
  inCatalog: boolean;
  /** Quantité dans la Collection (0 si non possédée). */
  ownedQuantity: number;
  /** Finitions dans lesquelles la Version existe. */
  finishes: Finish[];
  /** Prix de la Finition de référence dans la Devise d'affichage (`null` : « — »). */
  price: number | null;
  /** Variation de prix sur 7 / 30 jours, en % (`null` : pas assez d'historique). */
  priceChange7d: number | null;
  priceChange30d: number | null;
  /** Date d'ajout à la Liste de souhaits ; `null` si la Version n'y est pas. */
  wishlistedAt: IsoDateTime | null;
  /** Variation de prix depuis l'ajout aux souhaits, en % (`null` : pas de relevé). */
  wishlistPriceChange: number | null;
  imageSmall: string | null;
  imageNormal: string | null;
  /** Grande image, pour le classeur imprimé. */
  imageLarge: string | null;
};

/**
 * Une Version inconnue : son Code de version, gardé dans les Données précieuses
 * (Collection, Liste de souhaits), n'est plus dans le Catalogue. Sans prix, elle
 * est exclue de la valeur ; on ne la supprime jamais.
 */
function unknownEntry(
  printingCode: PrintingCode,
  ownedQuantity: number,
  wishlistedAt: IsoDateTime | null,
): CatalogEntry {
  const expansionCode = expansionCodeOf(printingCode);
  return {
    printingCode,
    name: printingCode,
    expansionCode,
    expansionRank: Number.MAX_SAFE_INTEGER,
    isPromo: isPromoExpansion(expansionCode),
    collectorNumber: '',
    rarity: '',
    variant: 'normal',
    type: '',
    domains: [],
    inCatalog: false,
    ownedQuantity,
    finishes: [],
    price: null,
    priceChange7d: null,
    priceChange30d: null,
    wishlistedAt,
    wishlistPriceChange: null,
    imageSmall: null,
    imageNormal: null,
    imageLarge: null,
  };
}

/**
 * Les Versions inconnues parmi `codes` : celles absentes de `entries` (le
 * Catalogue), avec leur quantité possédée et leur date d'ajout aux souhaits.
 */
export function unknownEntries(
  entries: readonly CatalogEntry[],
  codes: Iterable<PrintingCode>,
  owned: ReadonlyMap<PrintingCode, number>,
  wishlist: ReadonlyMap<PrintingCode, IsoDateTime>,
): CatalogEntry[] {
  const known = new Set(entries.map((entry) => entry.printingCode));
  return [...codes]
    .filter((code) => !known.has(code))
    .map((code) => unknownEntry(code, owned.get(code) ?? 0, wishlist.get(code) ?? null));
}

/** Les Versions, avec la quantité possédée de chacune (0 si absente de la Collection). */
export function withOwnedQuantities(
  entries: CatalogEntry[],
  owned: Map<PrintingCode, number>,
): CatalogEntry[] {
  return entries.map((entry) => ({ ...entry, ownedQuantity: owned.get(entry.printingCode) ?? 0 }));
}

/**
 * Les Versions, avec leur prix pour la Source de prix choisie (`prices`, par
 * Code de version), converti dans la Devise d'affichage.
 */
export function withPrices(
  entries: CatalogEntry[],
  prices: Map<string, FinishPrices>,
  displayCurrency: Currency,
  rates: readonly ExchangeRate[],
): CatalogEntry[] {
  // Les prix du jour prennent le dernier taux : inutile de garder l'historique.
  const latest = latestRatePerPair(rates);
  return entries.map((entry) => ({
    ...entry,
    price: referencePrice(entry.finishes, prices.get(entry.printingCode), displayCurrency, latest),
  }));
}

/**
 * Valeur de l'Indicateur de référence de chaque Version × Finition
 * (`printingFinishKey`) aujourd'hui, il y a 7 jours et il y a 30 jours, pour
 * la Source de prix choisie et en devise d'origine.
 */
export type ReferenceMetricValuesByDay = Record<
  'today' | 'daysAgo7' | 'daysAgo30',
  Map<string, number>
>;

/** Les Versions, avec la Variation de prix 7 j / 30 j de leur Finition de référence (spec § 3). */
export function withPriceChanges(
  entries: CatalogEntry[],
  values: ReferenceMetricValuesByDay,
): CatalogEntry[] {
  return entries.map((entry) => {
    const finish = referenceFinish(entry.finishes);
    const valueOf = (map: Map<string, number>) =>
      finish
        ? (map.get(printingFinishKey({ printingCode: entry.printingCode, finish })) ?? null)
        : null;
    const today = valueOf(values.today);
    return {
      ...entry,
      priceChange7d: percentChange(valueOf(values.daysAgo7), today),
      priceChange30d: percentChange(valueOf(values.daysAgo30), today),
    };
  });
}
