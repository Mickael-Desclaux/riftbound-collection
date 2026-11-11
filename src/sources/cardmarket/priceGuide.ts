/**
 * Adaptateur Cardmarket : price guide public de Riftbound (`idGame` 22), en EUR,
 * toutes langues et tous états confondus. Un fichier par nuit, daté par son
 * `createdAt`.
 */
import { z } from 'zod';

import type { IsoDateTime } from '@/domain/dates';
import { fetchJsonIfModified, type ConditionalResult, type Fetch } from '@/sources/http';

export const CARDMARKET_PRICE_GUIDE_URL =
  'https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_22.json';

/** Indicateurs publiés pour chaque Finition ; ceux de la foil portent le suffixe `-foil`. */
const METRICS = ['avg', 'low', 'trend', 'avg1', 'avg7', 'avg30'] as const;

const metric = z.number().nonnegative().nullable();
const normalMetrics = Object.fromEntries(METRICS.map((m) => [m, metric]));
const foilMetrics = Object.fromEntries(METRICS.map((m) => [`${m}-foil`, metric.optional()]));

/** `2026-11-11T02:45:56+0100` : un décalage sans deux-points, que Zod refuse. */
const CREATED_AT = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})([+-]\d{2})(\d{2})$/;

const guideSchema = z.object({
  version: z.literal(1),
  createdAt: z.string().regex(CREATED_AT),
  priceGuides: z
    .array(
      z.object({
        idProduct: z.number().int().positive(),
        idCategory: z.number().int(),
        ...normalMetrics,
        ...foilMetrics,
      }),
    )
    .min(1, 'aucun produit'),
});

type Metrics = Record<string, number | null>;

export type CardmarketPrice = {
  idProduct: number;
  /** `foil` manque quand le produit ne publie aucun indicateur foil. */
  finishes: { normal: Metrics; foil?: Metrics };
};

export type CardmarketPriceGuide = {
  /** Date de création du fichier (`createdAt`), qui date les Relevés de prix. */
  publishedAt: IsoDateTime;
  products: CardmarketPrice[];
};

/**
 * Cardmarket écrit un `trend` à 0 quand il n'a pas de prix (`avg` et `avg30`
 * sont alors vides) : on le lit comme absent.
 */
function metricsOf(row: Record<string, unknown>, suffix: '' | '-foil'): Metrics {
  return Object.fromEntries(
    METRICS.map((m) => {
      const value = (row[`${m}${suffix}`] as number | null | undefined) ?? null;
      return [m, m === 'trend' && value === 0 ? null : value];
    }),
  );
}

/**
 * Télécharge le price guide, sauf s'il n'a pas changé depuis `lastModified`
 * (réponse 304).
 */
export async function fetchCardmarketPriceGuide(
  fetch: Fetch,
  lastModified: string | null = null,
): Promise<ConditionalResult<CardmarketPriceGuide>> {
  const result = await fetchJsonIfModified(
    fetch,
    CARDMARKET_PRICE_GUIDE_URL,
    guideSchema,
    lastModified,
  );
  if (!result.modified) return result;
  const [, local, hours, minutes] = CREATED_AT.exec(result.data.createdAt) ?? [];
  const publishedAt = new Date(`${local}${hours}:${minutes}`).toISOString();
  const products = result.data.priceGuides.map((row) => {
    const hasFoil = METRICS.some((m) => `${m}-foil` in row);
    return {
      idProduct: row.idProduct,
      finishes: {
        normal: metricsOf(row, ''),
        ...(hasFoil ? { foil: metricsOf(row, '-foil') } : {}),
      },
    };
  });
  return { modified: true, lastModified: result.lastModified, data: { publishedAt, products } };
}
