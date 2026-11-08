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

// Imports relatifs : drizzle-kit charge ce fichier sans l'alias `@/`.
import type { PrintingVariant } from '../domain/catalog';
import type { IsoDate, IsoDateTime } from '../domain/dates';
import type { Currency, Finish, PriceSource } from '../domain/price';
import type { PrintingCode } from '../domain/printingCode';

export type ExchangeRateSource = 'frankfurter' | 'bank-of-canada';

/** Le Code de version porte le même nom de colonne dans toutes les tables. */
const printingCodeColumn = () => text('printing_code').$type<PrintingCode>();

/** Ce qui désigne un prix : une Version, une Source de prix et une Finition. */
const priceKeyColumns = () => ({
  printingCode: printingCodeColumn().notNull(),
  source: text('source').$type<PriceSource>().notNull(),
  finish: text('finish').$type<Finish>().notNull(),
});

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
    printingCode: printingCodeColumn().primaryKey(),
    cardOracleId: text('card_oracle_id')
      .notNull()
      .references(() => card.oracleId, { onDelete: 'cascade' }),
    expansionCode: text('expansion_code')
      .notNull()
      .references(() => expansion.code, { onDelete: 'cascade' }),
    collectorNumber: text('collector_number').notNull(),
    rarity: text('rarity').notNull(),
    variant: text('variant').$type<PrintingVariant>().notNull(),
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
    ...priceKeyColumns(),
    /** Valeur de l'Indicateur de référence, recopiée pour trier et filtrer. */
    referenceMetricValue: real('reference_metric_value'),
    /** Tous les indicateurs publiés par la source, tels quels. */
    metrics: text('metrics', { mode: 'json' }).$type<Record<string, number | null>>().notNull(),
    currency: text('currency').$type<Currency>().notNull(),
    publishedAt: text('published_at').$type<IsoDateTime>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.printingCode, t.source, t.finish] })],
);

/**
 * Un seul taux par jour et par paire de devises : la Banque du Canada ne sert
 * que si Frankfurter échoue, et `source` indique d'où vient le taux retenu.
 */
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

export const SOURCE_IDS = ['rifthunt-sets', 'rifthunt-catalog'] as const;
export type SourceId = (typeof SOURCE_IDS)[number];

/**
 * Dernière réussite et dernière erreur de chaque source (spec § 2.6, § 5).
 * Une source jamais contactée n'a pas de ligne.
 */
export const sourceState = sqliteTable('source_state', {
  source: text('source').$type<SourceId>().primaryKey(),
  lastSuccessAt: text('last_success_at').$type<IsoDateTime>(),
  lastErrorAt: text('last_error_at').$type<IsoDateTime>(),
  lastErrorMessage: text('last_error_message'),
});

// ---------------------------------------------------------------------------
// Données précieuses : jamais de clé étrangère vers le Catalogue (ADR 0001)
// ---------------------------------------------------------------------------

/**
 * Relevé de prix, enregistré seulement quand la valeur change.
 * Il est daté à l'instant de publication de la source, et non au jour : c'est
 * ce qui garantit qu'un même fichier ne crée jamais deux relevés. Les calculs
 * au jour près (Variation de prix, souhaits) se font à la lecture.
 */
export const priceRecord = sqliteTable(
  'price_record',
  {
    ...priceKeyColumns(),
    /** Instant de publication de la source (`updatedAt` TCGplayer, `createdAt` Cardmarket). */
    recordedAt: text('recorded_at').$type<IsoDateTime>().notNull(),
    value: real('value').notNull(),
  },
  (t) => [primaryKey({ columns: [t.printingCode, t.source, t.finish, t.recordedAt] })],
);

export const collectionEntry = sqliteTable(
  'collection_entry',
  {
    printingCode: printingCodeColumn().primaryKey(),
    quantity: integer('quantity').notNull(),
  },
  (t) => [check('collection_entry_quantity_positive', sql`${t.quantity} > 0`)],
);

export const wishlistEntry = sqliteTable('wishlist_entry', {
  printingCode: printingCodeColumn().primaryKey(),
  addedAt: text('added_at').$type<IsoDateTime>().notNull(),
  /**
   * Dernière Alerte de prix : prix dans la devise d'origine de sa source, et la
   * source elle-même, pour ne jamais comparer des euros à des dollars après un
   * changement de Source de prix.
   */
  lastAlertPrice: real('last_alert_price'),
  lastAlertSource: text('last_alert_source').$type<PriceSource>(),
  lastAlertAt: text('last_alert_at').$type<IsoDateTime>(),
});

/** Une Version de la Sélection du classeur. */
export const binderSelection = sqliteTable('binder_selection', {
  printingCode: printingCodeColumn().primaryKey(),
});

/** Réglages : valeurs encodées en JSON, lues via `settings.ts`. */
export const setting = sqliteTable('setting', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

/** Tables de chaque famille (ADR 0001), pour les tests et les futures migrations. */
export const referenceDataTables = {
  expansion,
  card,
  printing,
  currentPrice,
  exchangeRate,
  sourceState,
} as const;

export const preciousDataTables = {
  priceRecord,
  collectionEntry,
  wishlistEntry,
  binderSelection,
  setting,
} as const;
