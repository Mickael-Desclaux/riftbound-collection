import type { PrintingVariant } from './catalog';
import { latestRatePerPair, type ExchangeRate } from './exchangeRates';
import type { DisplayCurrency, Finish } from './price';
import { referencePrice, type FinishPrices } from './priceDisplay';
import type { PrintingCode } from './printingCode';

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
  /** Quantité dans la Collection (0 si non possédée). */
  ownedQuantity: number;
  /** Finitions dans lesquelles la Version existe. */
  finishes: Finish[];
  /** Prix de la Finition de référence dans la Devise d'affichage (`null` : « — »). */
  price: number | null;
  imageSmall: string | null;
  imageNormal: string | null;
};

/** Les Versions, avec la quantité possédée de chacune (0 si absente de la Collection). */
export function withOwnedQuantities(
  entries: CatalogEntry[],
  owned: Map<string, number>,
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
  displayCurrency: DisplayCurrency,
  rates: readonly ExchangeRate[],
): CatalogEntry[] {
  // Les prix du jour prennent le dernier taux : inutile de garder l'historique.
  const latest = latestRatePerPair(rates);
  return entries.map((entry) => ({
    ...entry,
    price: referencePrice(entry.finishes, prices.get(entry.printingCode), displayCurrency, latest),
  }));
}
