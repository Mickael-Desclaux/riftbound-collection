/**
 * Schéma SQLite (Drizzle).
 *
 * Deux familles de tables (ADR 0001) :
 * - Données de référence : téléchargées, reconstructibles à tout moment.
 * - Données précieuses : jamais effacées. Elles désignent les Versions par leur
 *   Code de version (`printing_code`), sans clé étrangère vers le Catalogue.
 *
 * Après toute modification : `pnpm db:generate` pour créer la migration.
 */
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

// Import relatif : drizzle-kit charge ce fichier sans l'alias `@/`.
import type { Currency, Finish, PriceSource } from '../domain/price';

export type ExchangeRateSource = 'frankfurter' | 'bank-of-canada';

/** Date du calendrier au format ISO `AAAA-MM-JJ`. */
type IsoDate = string;
/** Instant au format ISO 8601 complet, en UTC. */
type IsoDateTime = string;

// ---------------------------------------------------------------------------
// Données de référence
// ---------------------------------------------------------------------------

export const expansion = sqliteTable('expansion', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
  releasedAt: text('released_at').$type<IsoDate>(),
  isPromo: integer('is_promo', { mode: 'boolean' }).notNull(),
  cardCount: integer('card_count').notNull(),
});

export const card = sqliteTable('card', {
  /** `oracle_id` RiftHunt. */
  oracleId: text('oracle_id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  subtype: text('subtype'),
  domains: text('domains', { mode: 'json' }).$type<string[]>().notNull(),
  text: text('text'),
});

export const printing = sqliteTable(
  'printing',
  {
    code: text('code').primaryKey(),
    cardOracleId: text('card_oracle_id')
      .notNull()
      .references(() => card.oracleId, { onDelete: 'cascade' }),
    expansionCode: text('expansion_code')
      .notNull()
      .references(() => expansion.code, { onDelete: 'cascade' }),
    collectorNumber: text('collector_number').notNull(),
    rarity: text('rarity').notNull(),
    variant: text('variant').notNull(),
    finishes: text('finishes', { mode: 'json' }).$type<Finish[]>().notNull(),
    imageSmall: text('image_small'),
    imageNormal: text('image_normal'),
    imageLarge: text('image_large'),
    artist: text('artist'),
    /** `printing_id` RiftHunt. */
    rifthuntPrintingId: text('rifthunt_printing_id').notNull().unique(),
    /** Identifiant produit TCGplayer (`tcgId`). */
    tcgId: integer('tcg_id'),
    /** Identifiant produit Cardmarket (`idProduct`), via OpenRift. */
    cardmarketProductId: integer('cardmarket_product_id'),
  },
  (t) => [
    index('printing_expansion_idx').on(t.expansionCode, t.collectorNumber),
    index('printing_card_idx').on(t.cardOracleId),
  ],
);

/**
 * Prix du jour d'une Version, par Source de prix et Finition.
 * Pas de clé étrangère vers `printing` : un prix peut arriver avant la Version
 * correspondante, il est alors simplement ignoré par les jointures.
 */
export const currentPrice = sqliteTable(
  'current_price',
  {
    printingCode: text('printing_code').notNull(),
    source: text('source').$type<PriceSource>().notNull(),
    finish: text('finish').$type<Finish>().notNull(),
    /** Valeur de l'Indicateur de référence, recopiée pour trier et filtrer. */
    referenceValue: real('reference_value'),
    /** Tous les indicateurs publiés par la source, tels quels. */
    metrics: text('metrics', { mode: 'json' }).$type<Record<string, number | null>>().notNull(),
    currency: text('currency').$type<Currency>().notNull(),
    publishedAt: text('published_at').$type<IsoDateTime>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.printingCode, t.source, t.finish] })],
);

export const exchangeRate = sqliteTable(
  'exchange_rate',
  {
    date: text('date').$type<IsoDate>().notNull(),
    baseCurrency: text('base_currency').$type<Currency>().notNull(),
    quoteCurrency: text('quote_currency').$type<Currency>().notNull(),
    rate: real('rate').notNull(),
    source: text('source').$type<ExchangeRateSource>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.baseCurrency, t.quoteCurrency, t.date] })],
);

// ---------------------------------------------------------------------------
// Données précieuses : jamais de clé étrangère vers le Catalogue (ADR 0001)
// ---------------------------------------------------------------------------

/** Relevé de prix, enregistré seulement quand la valeur change. */
export const priceRecord = sqliteTable(
  'price_record',
  {
    printingCode: text('printing_code').notNull(),
    source: text('source').$type<PriceSource>().notNull(),
    finish: text('finish').$type<Finish>().notNull(),
    /** Date de publication de la source. */
    recordedAt: text('recorded_at').$type<IsoDateTime>().notNull(),
    value: real('value').notNull(),
  },
  (t) => [primaryKey({ columns: [t.printingCode, t.source, t.finish, t.recordedAt] })],
);

export const collectionEntry = sqliteTable(
  'collection_entry',
  {
    printingCode: text('printing_code').primaryKey(),
    quantity: integer('quantity').notNull(),
  },
  (t) => [check('collection_entry_quantity_positive', sql`${t.quantity} > 0`)],
);

export const wishlistEntry = sqliteTable('wishlist_entry', {
  printingCode: text('printing_code').primaryKey(),
  addedAt: text('added_at').$type<IsoDateTime>().notNull(),
  /** Prix (devise d'origine) et date de la dernière Alerte de prix. */
  lastAlertPrice: real('last_alert_price'),
  lastAlertAt: text('last_alert_at').$type<IsoDateTime>(),
});

/** Sélection du classeur. */
export const binderEntry = sqliteTable('binder_entry', {
  printingCode: text('printing_code').primaryKey(),
});

/** Réglages : valeurs encodées en JSON, lues via `settings.ts`. */
export const setting = sqliteTable('setting', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const referenceDataTables = {
  expansion,
  card,
  printing,
  currentPrice,
  exchangeRate,
} as const;

export const preciousDataTables = {
  priceRecord,
  collectionEntry,
  wishlistEntry,
  binderEntry,
  setting,
} as const;
