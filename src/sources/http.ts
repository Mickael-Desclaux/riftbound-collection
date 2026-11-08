import type { z } from 'zod';

/** Identifie le projet auprès des sources (demandé par RiftHunt). */
export const USER_AGENT =
  'RiftboundCollection/0.1 (+https://github.com/Mickael-Desclaux/riftbound-collection)';

/**
 * Pourquoi une source a échoué :
 * - `network` : pas de réponse (hors ligne, serveur injoignable) ;
 * - `http` : réponse en erreur (404, 500…) ;
 * - `format` : réponse au format inattendu.
 */
export type SourceErrorKind = 'network' | 'http' | 'format';

export class SourceError extends Error {
  constructor(
    readonly kind: SourceErrorKind,
    message: string,
    readonly details?: string,
  ) {
    super(message);
    this.name = 'SourceError';
  }
}

/** Télécharge une réponse JSON et la valide ; sinon lève une `SourceError`. */
export async function fetchJson<T>(
  fetch: typeof globalThis.fetch,
  url: string,
  schema: z.ZodType<T>,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
  } catch (error) {
    throw new SourceError('network', `Impossible de joindre ${new URL(url).host}.`, String(error));
  }
  if (!response.ok) {
    throw new SourceError('http', `${new URL(url).host} a répondu ${response.status}.`, url);
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new SourceError('format', `Réponse illisible de ${new URL(url).host}.`, String(error));
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new SourceError(
      'format',
      `Format inattendu dans la réponse de ${new URL(url).host}.`,
      `${url}\n${parsed.error.message}`,
    );
  }
  return parsed.data;
}
