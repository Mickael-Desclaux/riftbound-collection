import { readFileSync } from 'node:fs';
import path from 'node:path';

import { fakeFetch } from '@/sources/testing/fakeFetch';

import { downloadBinderImages, type ImageStore } from './binderImages';

const IMAGE = new Uint8Array(
  readFileSync(path.join(__dirname, '../sources/rifthunt/__fixtures__/image-small.webp')),
);
const JINX = 'https://images.rifthunt.com/cards/large/front/ogn/030a/jinx.webp?v=1';
const AHRI = 'https://images.rifthunt.com/cards/large/front/ogn/066/ahri.webp?v=1';

/** Un stockage en mémoire, qui note ce qu'on y range. */
function memoryStore(already: string[] = []): ImageStore & { saved: Map<string, string> } {
  const saved = new Map<string, string>(already.map((url) => [url, 'image/webp']));
  return {
    saved,
    has: async (url) => saved.has(url),
    save: async (url, bytes, contentType) => {
      expect(bytes).toEqual(IMAGE);
      saved.set(url, contentType);
    },
  };
}

const webp = { body: IMAGE, headers: { 'Content-Type': 'image/webp' } };

describe('downloadBinderImages', () => {
  it('télécharge les grandes images manquantes et annonce la progression', async () => {
    const { fetch, requests } = fakeFetch({ [JINX]: webp, [AHRI]: webp });
    const store = memoryStore([JINX]);
    const progress: [number, number][] = [];

    const failed = await downloadBinderImages({ fetch, store }, [JINX, AHRI], (done, total) =>
      progress.push([done, total]),
    );

    expect(failed).toEqual(new Set());
    expect(requests.map((r) => r.url)).toEqual([AHRI]);
    expect(store.saved.get(AHRI)).toBe('image/webp');
    expect(progress.at(-1)).toEqual([2, 2]);
  });

  it("rend les images indisponibles sans arrêter les autres : erreur réseau, HTTP, ou réponse qui n'est pas une image", async () => {
    const page = 'https://images.rifthunt.com/cards/large/front/ogn/001/page.webp';
    const { fetch } = fakeFetch({
      [JINX]: new TypeError('Network request failed'),
      [AHRI]: { status: 404, body: {} },
      [page]: { body: { error: 'html' }, headers: { 'Content-Type': 'text/html' } },
      'https://images.rifthunt.com/ok.webp': webp,
    });
    const store = memoryStore();

    const failed = await downloadBinderImages({ fetch, store }, [
      JINX,
      AHRI,
      page,
      'https://images.rifthunt.com/ok.webp',
    ]);

    expect(failed).toEqual(new Set([JINX, AHRI, page]));
    expect([...store.saved.keys()]).toEqual(['https://images.rifthunt.com/ok.webp']);
  });
});
