import type { z } from 'zod';

/** Identifie le projet auprès des sources (demandé par RiftHunt). */
export const USER_AGENT =
  'RiftboundCollection/0.1 (+https://github.com/Mickael-Desclaux/riftbound-collection)';

export type Fetch = typeof globalThis.fetch;

/**
 * Pourquoi une source a échoué :
 * - `network` : pas de réponse (hors ligne, serveur injoignable, délai dépassé) ;
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

/** Au-delà, une requête sans réponse est abandonnée (réseau instable). */
const TIMEOUT_MS = 30_000;

/** Télécharge une réponse JSON et la valide ; sinon lève une `SourceError`. */
export async function fetchJson<T>(
  fetch: Fetch,
  url: string,
  schema: z.ZodType<T>,
  { timeoutMs = TIMEOUT_MS }: { timeoutMs?: number } = {},
): Promise<T> {
  const host = new URL(url).host;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  let body: unknown;
  try {
    try {
      response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: controller.signal,
      });
    } catch (error) {
      throw new SourceError('network', `Impossible de joindre ${host}.`, String(error));
    }
    if (!response.ok) {
      throw new SourceError('http', `${host} a répondu ${response.status}.`, url);
    }
    try {
      body = await response.json();
    } catch (error) {
      throw new SourceError('format', `Réponse illisible de ${host}.`, String(error));
    }
  } finally {
    clearTimeout(timeout);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new SourceError(
      'format',
      `Format inattendu dans la réponse de ${host}.`,
      `${url}\n${parsed.error.message}`,
    );
  }
  return parsed.data;
}
