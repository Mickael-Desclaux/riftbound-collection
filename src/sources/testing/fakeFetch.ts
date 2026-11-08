/** Une requête reçue par le faux `fetch`. */
export type RecordedRequest = { url: string; headers: Record<string, string> };

type FakeResponse = { status?: number; body?: unknown; headers?: Record<string, string> } | Error;

/**
 * Faux `fetch` pour les tests : sert une réponse enregistrée par URL exacte,
 * et garde la trace des requêtes. Une URL inconnue fait échouer le test.
 */
export function fakeFetch(responses: Record<string, FakeResponse>) {
  const requests: RecordedRequest[] = [];
  const fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = input.toString();
    requests.push({ url, headers: Object.fromEntries(new Headers(init?.headers).entries()) });
    const response = responses[url];
    if (response === undefined) throw new Error(`URL inattendue dans le test : ${url}`);
    if (response instanceof Error) throw response;
    const status = response.status ?? 200;
    // Une réponse 304 n'a pas de corps.
    const body = status === 304 ? null : JSON.stringify(response.body);
    return new Response(body, { status, headers: response.headers });
  };
  return { fetch: fetch as typeof globalThis.fetch, requests };
}
