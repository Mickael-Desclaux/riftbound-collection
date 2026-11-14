/**
 * Grandes images du classeur (spec § 2.5) : téléchargées avant l'export PDF,
 * gardées sur le téléphone pour les exports suivants.
 */
import { fetchImage, type Fetch } from '@/sources/http';

/** Où ranger les images, désignées par leur adresse (adaptateur expo-file-system dans l'app). */
export type ImageStore = {
  has: (url: string) => Promise<boolean>;
  save: (url: string, bytes: Uint8Array, contentType: string) => Promise<void>;
};

export type BinderImageDeps = { fetch: Fetch; store: ImageStore };

/** Téléchargements simultanés : assez pour aller vite, sans saturer le réseau du téléphone. */
const PARALLEL_DOWNLOADS = 4;

/**
 * Télécharge les images de `urls` absentes de `store`, en annonçant la
 * progression (images prêtes / total). Rend les adresses des images
 * indisponibles : une image qui échoue n'arrête pas les autres.
 */
export async function downloadBinderImages(
  { fetch, store }: BinderImageDeps,
  urls: readonly string[],
  onProgress: (done: number, total: number) => void = () => {},
): Promise<Set<string>> {
  const pending = [...new Set(urls)];
  const total = pending.length;
  const failed = new Set<string>();
  let done = 0;
  onProgress(done, total);

  async function worker(): Promise<void> {
    for (let url = pending.shift(); url !== undefined; url = pending.shift()) {
      try {
        if (!(await store.has(url))) {
          const image = await fetchImage(fetch, url);
          await store.save(url, image.bytes, image.contentType);
        }
      } catch {
        failed.add(url);
      }
      done += 1;
      onProgress(done, total);
    }
  }

  await Promise.all(Array.from({ length: PARALLEL_DOWNLOADS }, worker));
  return failed;
}
