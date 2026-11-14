/**
 * Liste de souhaits (spec § 2.4, § 3 point 9) : les Versions que l'utilisateur
 * veut acquérir, et la variation de leur prix depuis leur ajout.
 */
import { unknownEntries, type CatalogEntry } from './catalogEntry';
import { toIsoDate, type IsoDate, type IsoDateTime } from './dates';
import { referenceFinish } from './priceDisplay';
import {
  dailySeries,
  percentChange,
  type PrintingFinishHistory,
  type RecordedValue,
} from './priceHistory';
import { printingFinishKey } from './priceRecords';
import type { PrintingCode } from './printingCode';

/**
 * Variation en % depuis l'ajout, en devise d'origine : de la valeur du jour de
 * l'ajout (UTC), ou à défaut du premier relevé qui le suit, à celle d'aujourd'hui.
 */
export function wishlistPriceChange(
  records: readonly RecordedValue[],
  addedAt: IsoDateTime,
  today: IsoDate,
): number | null {
  const series = dailySeries(records, { start: toIsoDate(new Date(addedAt)), end: today });
  return percentChange(series[0]?.value ?? null, series.at(-1)?.value ?? null);
}

/**
 * Les Versions, avec leur date d'ajout aux souhaits et la variation de prix de
 * leur Finition de référence depuis, d'après `history` (Source de prix choisie).
 */
export function withWishlist(
  entries: CatalogEntry[],
  wishlist: ReadonlyMap<PrintingCode, IsoDateTime>,
  history: PrintingFinishHistory,
  today: IsoDate,
): CatalogEntry[] {
  return entries.map((entry) => {
    const wishlistedAt = wishlist.get(entry.printingCode) ?? null;
    const finish = referenceFinish(entry.finishes);
    const records =
      finish && history.get(printingFinishKey({ printingCode: entry.printingCode, finish }));
    return {
      ...entry,
      wishlistedAt,
      wishlistPriceChange:
        wishlistedAt && records ? wishlistPriceChange(records, wishlistedAt, today) : null,
    };
  });
}

/**
 * Les Versions de l'onglet Souhaits : celles du Catalogue en souhait
 * (`entries`, avec leur date d'ajout), puis les Versions inconnues de `wishlist`.
 */
export function wishlistEntries(
  entries: CatalogEntry[],
  wishlist: ReadonlyMap<PrintingCode, IsoDateTime>,
  owned: ReadonlyMap<PrintingCode, number>,
): CatalogEntry[] {
  const unknown = unknownEntries(entries, wishlist.keys(), owned, wishlist);
  return [...entries, ...unknown].filter((entry) => entry.wishlistedAt !== null);
}

/** « N cartes · coût total X » ; les cartes sans prix sont comptées à part. */
export type WishlistCost = { printingCount: number; total: number; unpricedCount: number };

/** Le coût total des souhaits, d'après le prix de chacun dans la Devise d'affichage. */
export function wishlistCost(entries: readonly CatalogEntry[]): WishlistCost {
  const result: WishlistCost = { printingCount: 0, total: 0, unpricedCount: 0 };
  for (const { wishlistedAt, price } of entries) {
    if (wishlistedAt === null) continue;
    result.printingCount += 1;
    if (price === null) result.unpricedCount += 1;
    else result.total += price;
  }
  return result;
}

/**
 * Une Version qui passe de 0 à au moins 1 exemplaire quitte la Liste de
 * souhaits, quel que soit l'écran (spec § 2.4).
 */
export function leavesWishlist(previousQuantity: number, quantity: number): boolean {
  return previousQuantity === 0 && quantity > 0;
}
