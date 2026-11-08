import { z } from 'zod';

import { fetchJson, type Fetch } from './http';

describe('fetchJson', () => {
  it('abandonne une requête restée sans réponse, comme une absence de réseau', async () => {
    const hanging: Fetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });

    await expect(
      fetchJson(hanging, 'https://api.rifthunt.com/sets', z.object({}), { timeoutMs: 10 }),
    ).rejects.toMatchObject({
      kind: 'network',
      message: 'Impossible de joindre api.rifthunt.com.',
    });
  });
});
