/**
 * Lectures et actions de la fiche d'une Version (spec § 2.2). Les actions
 * écrivent dans les Données précieuses, désignées par le Code de version.
 */
import { and, asc, eq, ne } from 'drizzle-orm';

import type { PrintingVariant } from '@/domain/catalog';
import type { IsoDateTime } from '@/domain/dates';
import type { Finish } from '@/domain/price';
import type { DetailPrices } from '@/domain/printingDetail';
import type { PrintingCode } from '@/domain/printingCode';

import type { AppDatabase } from './database';
import {
  binderSelection,
  card,
  collectionEntry,
  currentPrice,
  expansion,
  printing,
  wishlistEntry,
} from './schema';

/** Tables dont dépend `readPrintingDetail`, pour la relecture réactive. */
export const PRINTING_DETAIL_TABLES = ['printing', 'card', 'expansion', 'current_price'];

/** Tables dont dépend `readPrintingState`. */
export const PRINTING_STATE_TABLES = ['collection_entry', 'wishlist_entry', 'binder_selection'];

/** Une autre Version de la même Carte, pour la bande « Autres versions ». */
export type OtherPrinting = {
  printingCode: PrintingCode;
  name: string;
  imageSmall: string | null;
  imageNormal: string | null;
};

export type PrintingDetail = {
  printingCode: PrintingCode;
  name: string;
  expansionCode: string;
  expansionName: string;
  collectorNumber: string;
  rarity: string;
  variant: PrintingVariant;
  finishes: Finish[];
  type: string;
  domains: string[];
  artist: string | null;
  imageSmall: string | null;
  imageNormal: string | null;
  imageLarge: string | null;
  tcgId: number | null;
  cardmarketProductId: number | null;
  prices: DetailPrices;
  otherPrintings: OtherPrinting[];
};

/** La fiche d'une Version ; `undefined` si son Code de version n'est pas dans le Catalogue. */
export function readPrintingDetail(
  db: AppDatabase,
  printingCode: PrintingCode,
): PrintingDetail | undefined {
  const row = db
    .select({
      printingCode: printing.printingCode,
      cardOracleId: printing.cardOracleId,
      name: card.name,
      expansionCode: printing.expansionCode,
      expansionName: expansion.name,
      collectorNumber: printing.collectorNumber,
      rarity: printing.rarity,
      variant: printing.variant,
      finishes: printing.finishes,
      type: card.type,
      domains: card.domains,
      artist: printing.artist,
      imageSmall: printing.imageSmall,
      imageNormal: printing.imageNormal,
      imageLarge: printing.imageLarge,
      tcgId: printing.tcgId,
      cardmarketProductId: printing.cardmarketProductId,
    })
    .from(printing)
    .innerJoin(card, eq(card.oracleId, printing.cardOracleId))
    .innerJoin(expansion, eq(expansion.code, printing.expansionCode))
    .where(eq(printing.printingCode, printingCode))
    .get();
  if (!row) return undefined;
  const { cardOracleId, ...detail } = row;

  const prices: DetailPrices = {};
  const priceRows = db
    .select()
    .from(currentPrice)
    .where(eq(currentPrice.printingCode, printingCode))
    .all();
  for (const p of priceRows) {
    prices[p.source] = {
      ...prices[p.source],
      [p.finish]: {
        value: p.referenceMetricValue,
        currency: p.currency,
        publishedAt: p.publishedAt,
      },
    };
  }

  const otherPrintings = db
    .select({
      printingCode: printing.printingCode,
      name: card.name,
      imageSmall: printing.imageSmall,
      imageNormal: printing.imageNormal,
    })
    .from(printing)
    .innerJoin(card, eq(card.oracleId, printing.cardOracleId))
    .where(and(eq(printing.cardOracleId, cardOracleId), ne(printing.printingCode, printingCode)))
    .orderBy(asc(printing.printingCode))
    .all();

  return { ...detail, prices, otherPrintings };
}

/** Ce que l'utilisateur a fait de la Version : quantité possédée, souhait, classeur. */
export type PrintingState = {
  quantity: number;
  /** Date d'ajout à la Liste de souhaits ; `null` si la Version n'y est pas. */
  wishlistedAt: IsoDateTime | null;
  inBinderSelection: boolean;
};

export function readPrintingState(db: AppDatabase, printingCode: PrintingCode): PrintingState {
  const owned = db
    .select({ quantity: collectionEntry.quantity })
    .from(collectionEntry)
    .where(eq(collectionEntry.printingCode, printingCode))
    .get();
  const wished = db
    .select({ addedAt: wishlistEntry.addedAt })
    .from(wishlistEntry)
    .where(eq(wishlistEntry.printingCode, printingCode))
    .get();
  const inBinder = db
    .select()
    .from(binderSelection)
    .where(eq(binderSelection.printingCode, printingCode))
    .get();
  return {
    quantity: owned?.quantity ?? 0,
    wishlistedAt: wished?.addedAt ?? null,
    inBinderSelection: inBinder !== undefined,
  };
}

/** Règle la quantité dans la Collection ; à 0, la Version en est retirée. */
export function setOwnedQuantity(
  db: AppDatabase,
  printingCode: PrintingCode,
  quantity: number,
): void {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error(`Quantité refusée pour ${printingCode} : ${quantity}`);
  }
  if (quantity === 0) {
    db.delete(collectionEntry).where(eq(collectionEntry.printingCode, printingCode)).run();
    return;
  }
  db.insert(collectionEntry)
    .values({ printingCode, quantity })
    .onConflictDoUpdate({ target: collectionEntry.printingCode, set: { quantity } })
    .run();
}

/**
 * Ajoute la Version à la Liste de souhaits à la date `addedAt`, ou l'en retire
 * (`null`). Déjà en souhait, elle garde sa date d'ajout d'origine.
 */
export function setWishlisted(
  db: AppDatabase,
  printingCode: PrintingCode,
  addedAt: IsoDateTime | null,
): void {
  if (addedAt === null) {
    db.delete(wishlistEntry).where(eq(wishlistEntry.printingCode, printingCode)).run();
    return;
  }
  db.insert(wishlistEntry).values({ printingCode, addedAt }).onConflictDoNothing().run();
}

export function setInBinderSelection(
  db: AppDatabase,
  printingCode: PrintingCode,
  selected: boolean,
): void {
  if (!selected) {
    db.delete(binderSelection).where(eq(binderSelection.printingCode, printingCode)).run();
    return;
  }
  db.insert(binderSelection).values({ printingCode }).onConflictDoNothing().run();
}
