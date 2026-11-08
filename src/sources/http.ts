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

type RequestOptions = { timeoutMs?: number };

/** Télécharge une réponse JSON et la valide ; sinon lève une `SourceError`. */
export async function fetchJson<T>(
  fetch: Fetch,
  url: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
): Promise<T> {
  const result = await request(fetch, url, schema, {}, options);
  if (!result.modified) {
    throw new SourceError(
      'http',
      `${new URL(url).host} a répondu 304 sans requête conditionnelle.`,
    );
  }
  return result.data;
}

/** Réponse d'une requête conditionnelle. */
export type ConditionalResult<T> =
  { modified: false } | { modified: true; data: T; lastModified: string | null };

/**
 * Comme `fetchJson`, mais sans retélécharger un fichier inchangé : avec la date
 * `Last-Modified` de la dernière réponse, le serveur peut répondre 304.
 */
export async function fetchJsonIfModified<T>(
  fetch: Fetch,
  url: string,
  schema: z.ZodType<T>,
  lastModified: string | null,
  options: RequestOptions = {},
): Promise<ConditionalResult<T>> {
  const headers: Record<string, string> = lastModified ? { 'If-Modified-Since': lastModified } : {};
  return request(fetch, url, schema, headers, options);
}

async function request<T>(
  fetch: Fetch,
  url: string,
  schema: z.ZodType<T>,
  extraHeaders: Record<string, string>,
  { timeoutMs = TIMEOUT_MS }: RequestOptions,
): Promise<ConditionalResult<T>> {
  const host = new URL(url).host;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  let body: unknown;
  try {
    try {
      response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...extraHeaders },
        signal: controller.signal,
      });
    } catch (error) {
      throw new SourceError('network', `Impossible de joindre ${host}.`, String(error));
    }
    if (response.status === 304) return { modified: false };
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
  return {
    modified: true,
    data: parsed.data,
    lastModified: response.headers.get('Last-Modified'),
  };
}
