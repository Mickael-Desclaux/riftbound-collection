import type { PrintingVariant } from './catalog';
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
