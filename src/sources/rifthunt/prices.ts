/** Adaptateur RiftHunt : prix TCGplayer du jour (`/bulk/prices`, USD). */
import { z } from 'zod';

import type { IsoDateTime } from '@/domain/dates';
import { FINISHES, type Finish } from '@/domain/price';
import { fetchJsonIfModified, type ConditionalResult, type Fetch } from '@/sources/http';

export const RIFTHUNT_PRICES_URL = 'https://api.rifthunt.com/bulk/prices';

const metric = z.number().nonnegative().nullable();
const metricsSchema = z.object({
  low: metric,
  mid: metric,
  high: metric,
  market: metric,
  directLow: metric,
});

const pricesSchema = z.object({
  source: z.literal('tcgplayer'),
  currency: z.literal('USD'),
  prices: z.array(
    z.object({
      tcgId: z.string().regex(/^\d+$/),
      updatedAt: z.iso.datetime(),
      finishes: z.object({ normal: metricsSchema.optional(), foil: metricsSchema.optional() }),
    }),
  ),
});

/** Les prix TCGplayer d'un produit, pour chaque Finition qui a au moins un prix. */
export type TcgplayerPrice = {
  tcgId: number;
  /** Date de publication TCGplayer (`updatedAt`), qui date les Relevés de prix. */
  publishedAt: IsoDateTime;
  finishes: { finish: Finish; metrics: Record<string, number | null> }[];
};

/**
 * Télécharge les prix TCGplayer, sauf si le fichier n'a pas changé depuis
 * `lastModified` (réponse 304).
 */
export async function fetchTcgplayerPrices(
  fetch: Fetch,
  lastModified: string | null = null,
): Promise<ConditionalResult<TcgplayerPrice[]>> {
  const result = await fetchJsonIfModified(fetch, RIFTHUNT_PRICES_URL, pricesSchema, lastModified);
  if (!result.modified) return result;
  const data = result.data.prices.map((row) => ({
    tcgId: Number(row.tcgId),
    publishedAt: row.updatedAt,
    finishes: FINISHES.flatMap((finish) => {
      const metrics = row.finishes[finish];
      if (!metrics || Object.values(metrics).every((value) => value === null)) return [];
      return [{ finish, metrics }];
    }),
  }));
  return { modified: true, lastModified: result.lastModified, data };
}
