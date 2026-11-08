/** Adaptateur RiftHunt : Extensions et Catalogue (https://api.rifthunt.com). */
import { z } from 'zod';

import {
  isPromoExpansion,
  type Card,
  type Expansion,
  type Printing,
  type PrintingVariant,
} from '@/domain/catalog';
import { editionOf, printingCodeOf } from '@/domain/printingCode';
import { fetchJson, SourceError } from '@/sources/http';

const API = 'https://api.rifthunt.com';

const setsSchema = z.object({
  object: z.literal('list'),
  data: z.array(
    z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      release_date: z.iso.datetime().nullable(),
      card_count: z.number().int().nonnegative(),
    }),
  ),
});

export async function fetchExpansions(fetch: typeof globalThis.fetch): Promise<Expansion[]> {
  const sets = await fetchJson(fetch, `${API}/sets`, setsSchema);
  return sets.data.map((set) => ({
    code: set.code.toUpperCase(),
    name: set.name,
    releasedAt: set.release_date === null ? null : set.release_date.slice(0, 10),
    isPromo: isPromoExpansion(set.code),
    cardCount: set.card_count,
  }));
}

const cardSchema = z.object({
  printing_id: z.string().min(1),
  oracle_id: z.string().min(1),
  oracle_name: z.string().min(1),
  name: z.string().min(1),
  set: z.string().min(1),
  collector_number: z.string().min(1),
  riftbound_id: z.string().min(1),
  rarity: z.string().min(1),
  type: z.string().min(1),
  domains: z.array(z.string()),
  rules_text: z.string().nullable(),
  variant: z.enum(['alternate', 'overnumbered', 'signature', 'showcase']).nullable(),
  artist: z.string().nullable(),
  images: z.object({
    small: z.url().nullish(),
    normal: z.url().nullish(),
    large: z.url().nullish(),
  }),
  tcg_id: z.string().regex(/^\d+$/).nullable(),
  finishes: z.array(z.enum(['normal', 'foil'])).nullable(),
});
type RiftHuntCard = z.infer<typeof cardSchema>;

const catalogPageSchema = z.object({
  object: z.literal('list'),
  total_cards: z.number().int().nonnegative(),
  has_more: z.boolean(),
  data: z.array(cardSchema),
});

/** Garde-fou contre une pagination qui ne finirait jamais (10 pages en 2026). */
const MAX_PAGES = 50;

const catalogPageUrl = (page: number) =>
  `${API}/cards/search?q=lang%3Aen&unique=prints&page=${page}`;

/**
 * Télécharge le Catalogue complet, page par page.
 * `onProgress(reçues, total)` est appelé après chaque page.
 */
export async function fetchCatalog(
  fetch: typeof globalThis.fetch,
  onProgress?: (received: number, total: number) => void,
): Promise<{ cards: Card[]; printings: Printing[] }> {
  const rows: RiftHuntCard[] = [];
  for (let page = 1; ; page++) {
    if (page > MAX_PAGES) {
      throw new SourceError('format', 'Pagination inattendue du catalogue RiftHunt.');
    }
    const response = await fetchJson(fetch, catalogPageUrl(page), catalogPageSchema);
    rows.push(...response.data);
    onProgress?.(rows.length, response.total_cards);
    if (!response.has_more) break;
  }
  try {
    return { cards: cardsOf(rows), printings: rows.map(printingOf) };
  } catch (error) {
    throw new SourceError('format', 'Format inattendu dans le catalogue RiftHunt.', String(error));
  }
}

/** Une Carte par `oracle_id` : ses données sont identiques sur toutes ses Versions. */
function cardsOf(rows: RiftHuntCard[]): Card[] {
  const cards = new Map<string, Card>();
  for (const row of rows) {
    if (cards.has(row.oracle_id)) continue;
    cards.set(row.oracle_id, {
      oracleId: row.oracle_id,
      name: row.oracle_name,
      type: row.type,
      subtype: null,
      domains: row.domains,
      text: row.rules_text,
    });
  }
  return [...cards.values()];
}

function printingOf(row: RiftHuntCard): Printing {
  return {
    printingCode: printingCodeOf({
      expansionCode: row.set,
      collectorNumber: row.collector_number,
      riftboundId: row.riftbound_id,
      name: row.name,
    }),
    cardOracleId: row.oracle_id,
    expansionCode: row.set.toUpperCase(),
    collectorNumber: row.collector_number,
    rarity: row.rarity,
    variant: variantOf(row),
    finishes: row.finishes ?? [],
    imageSmall: row.images.small ?? null,
    imageNormal: row.images.normal ?? null,
    imageLarge: row.images.large ?? null,
    artist: row.artist,
    rifthuntPrintingId: row.printing_id,
    tcgId: row.tcg_id === null ? null : Number(row.tcg_id),
  };
}

/** Les Versions Metal ne sont signalées que par leur nom (« … (Metal) »). */
function variantOf(row: RiftHuntCard): PrintingVariant {
  if (editionOf(row.name) === 'metal') return 'metal';
  return row.variant ?? 'normal';
}
