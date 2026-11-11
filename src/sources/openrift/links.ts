/**
 * Adaptateur OpenRift : correspondance `tcgId` → `idProduct` Cardmarket
 * (`/prices/links`). Le price guide Cardmarket n'a ni numéro ni variante :
 * cette table, tenue par OpenRift, est le seul lien vers nos Versions.
 */
import { z } from 'zod';

import { fetchJson, SourceError, type Fetch } from '@/sources/http';

export const OPENRIFT_LINKS_URL = 'https://openrift.app/api/v1/prices/links';

const marketplaceLink = z.object({
  available: z.boolean(),
  productId: z.number().int().positive().nullable(),
});

/** Une entrée par printing OpenRift (Version × Finition × langue). Les autres places de marché sont ignorées. */
const linksSchema = z.object({
  links: z
    .record(z.string(), z.object({ tcgplayer: marketplaceLink, cardmarket: marketplaceLink }))
    .refine((links) => Object.keys(links).length > 0, 'aucune correspondance'),
});

/** `idProduct` Cardmarket de chaque produit TCGplayer, quand OpenRift en connaît un. */
export async function fetchCardmarketLinks(fetch: Fetch): Promise<Map<number, number>> {
  const { links } = await fetchJson(fetch, OPENRIFT_LINKS_URL, linksSchema);
  const byTcgId = new Map<number, number>();
  for (const { tcgplayer, cardmarket } of Object.values(links)) {
    if (!tcgplayer.available || !cardmarket.available) continue;
    if (tcgplayer.productId === null || cardmarket.productId === null) continue;
    const known = byTcgId.get(tcgplayer.productId);
    if (known !== undefined && known !== cardmarket.productId) {
      // Les printings d'une même Version (Finitions, langues) partagent leurs produits.
      throw new SourceError(
        'format',
        `OpenRift relie le produit TCGplayer ${tcgplayer.productId} à deux produits Cardmarket (${known} et ${cardmarket.productId}).`,
      );
    }
    byTcgId.set(tcgplayer.productId, cardmarket.productId);
  }
  return byTcgId;
}
