/**
 * Lectures des grilles de Versions. Le filtrage, le tri et la pagination sont
 * des règles pures de `domain/` (`filterCatalog`, `sortCatalog`, `pageOf`) :
 * on lit ici la liste complète, relue seulement quand la base change.
 */
import { asc, eq, sql } from 'drizzle-orm';

import type { CatalogEntry } from '@/domain/catalogEntry';

import type { AppDatabase } from './database';
import { card, expansion, printing } from './schema';

/** Tables dont dépend `readCatalogEntries`, pour la relecture réactive. */
export const CATALOG_ENTRY_TABLES = ['printing', 'card', 'expansion'];

/** Ordre de sortie des Extensions ; celles sans date (souvent les promos) en dernier. */
const expansionOrder = [
  sql`${expansion.releasedAt} IS NULL`,
  asc(expansion.releasedAt),
  asc(expansion.code),
];

/** Extensions de la rangée de puces, dans l'ordre de sortie. */
export function selectExpansionChips(db: AppDatabase, showPromo: boolean) {
  return db
    .select({ code: expansion.code, name: expansion.name })
    .from(expansion)
    .where(showPromo ? undefined : eq(expansion.isPromo, false))
    .orderBy(...expansionOrder);
}

/**
 * Toutes les Versions du Catalogue, avec leur Carte et leur Extension.
 * `ownedQuantity` vaut 0 et `price` vaut `null` : quantités et prix sont lus à
 * part (`readOwnedQuantities`, `readCurrentPrices`), pour qu'un ✓ ou un nouveau
 * prix ne relise pas les 1 725 Versions (voir `withOwnedQuantities` et
 * `withPrices` dans `domain/`).
 */
export function readCatalogEntries(db: AppDatabase): CatalogEntry[] {
  const rank = new Map(
    selectExpansionChips(db, true)
      .all()
      .map((e, index) => [e.code, index]),
  );
  return db
    .select({
      printingCode: printing.printingCode,
      name: card.name,
      expansionCode: printing.expansionCode,
      isPromo: expansion.isPromo,
      collectorNumber: printing.collectorNumber,
      rarity: printing.rarity,
      variant: printing.variant,
      finishes: printing.finishes,
      type: card.type,
      domains: card.domains,
      imageSmall: printing.imageSmall,
      imageNormal: printing.imageNormal,
      imageLarge: printing.imageLarge,
    })
    .from(printing)
    .innerJoin(card, eq(card.oracleId, printing.cardOracleId))
    .innerJoin(expansion, eq(expansion.code, printing.expansionCode))
    .all()
    .map((row) => ({
      ...row,
      expansionRank: rank.get(row.expansionCode) ?? rank.size,
      inCatalog: true,
      ownedQuantity: 0,
      price: null,
      priceChange7d: null,
      priceChange30d: null,
      wishlistedAt: null,
      wishlistPriceChange: null,
    }));
}

/** Valeurs proposées par la feuille de filtres : celles présentes dans le Catalogue. */
export function readFilterOptions(db: AppDatabase): {
  rarities: string[];
  types: string[];
  domains: string[];
} {
  const distinct = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b));
  const printings = db.select({ rarity: printing.rarity }).from(printing).all();
  const cards = db.select({ type: card.type, domains: card.domains }).from(card).all();
  return {
    rarities: distinct(printings.map((p) => p.rarity)),
    types: distinct(cards.map((c) => c.type)),
    domains: distinct(cards.flatMap((c) => c.domains)),
  };
}
