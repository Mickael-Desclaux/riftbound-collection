/**
 * Ce que porte une notification de l'app, pour savoir quoi ouvrir quand on la
 * touche. Ces données viennent de l'app elle-même ; une forme inconnue (une
 * notification d'une version précédente, par exemple) ouvre l'app sans plus.
 */
import { z } from 'zod';

const newExpansionsData = z.object({
  kind: z.literal('newExpansions'),
  expansions: z
    .array(z.object({ code: z.string(), name: z.string(), isPromo: z.boolean() }))
    .min(1),
});

const priceAlertsData = z.object({ kind: z.literal('priceAlerts') });

const notificationData = z.discriminatedUnion('kind', [newExpansionsData, priceAlertsData]);

export type NotificationData = z.infer<typeof notificationData>;

export function parseNotificationData(data: unknown): NotificationData | null {
  const parsed = notificationData.safeParse(data);
  return parsed.success ? parsed.data : null;
}
