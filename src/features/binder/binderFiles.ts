/**
 * Fichiers du classeur sur le téléphone (expo-file-system, expo-print,
 * expo-sharing). Aucune règle ici : la mise en page est dans `binderHtml`.
 */
import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { ImageStore } from '@/sync/binderImages';

/** Types d'image gardés, et l'extension de leur fichier. */
const EXTENSIONS: Record<string, string> = {
  'image/webp': 'webp',
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

/**
 * Le dossier des grandes images, dans le cache : Android peut le vider, elles
 * seront alors simplement retéléchargées au prochain export.
 */
const imageDirectory = () => new Directory(Paths.cache, 'binder-images');

/** Un nom de fichier stable pour une adresse (FNV-1a 32 bits). */
function fileKey(url: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < url.length; i += 1) {
    hash ^= url.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${hash.toString(16).padStart(8, '0')}-${url.length}`;
}

/** Le fichier déjà rangé pour cette adresse, et son type. */
function storedImage(url: string): { file: File; contentType: string } | null {
  for (const [contentType, extension] of Object.entries(EXTENSIONS)) {
    const file = new File(imageDirectory(), `${fileKey(url)}.${extension}`);
    if (file.exists) return { file, contentType };
  }
  return null;
}

export const fileSystemImageStore: ImageStore = {
  async has(url) {
    return storedImage(url) !== null;
  },
  async save(url, bytes, contentType) {
    const extension = EXTENSIONS[contentType];
    if (!extension) throw new Error(`Type d'image non pris en charge : ${contentType}`);
    const directory = imageDirectory();
    directory.create({ intermediates: true, idempotent: true });
    // Écrite à côté puis renommée : une image interrompue n'est jamais prise pour complète.
    const pending = new File(directory, `${fileKey(url)}.tmp`);
    pending.create({ overwrite: true });
    await pending.write(bytes);
    pending.moveSync(new File(directory, `${fileKey(url)}.${extension}`), { overwrite: true });
  },
};

/**
 * L'image rangée, en `data:` : le WebView d'expo-print n'a pas accès aux
 * fichiers du téléphone. `null` si elle n'a pas été téléchargée.
 */
export async function readImageDataUri(url: string): Promise<string | null> {
  const stored = storedImage(url);
  if (!stored) return null;
  return `data:${stored.contentType};base64,${await stored.file.base64()}`;
}

/** Imprime le classeur en PDF A4 (595 × 842 points), puis ouvre la fenêtre de partage. */
export async function shareBinderPdf(html: string, fileName: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
  const printed = new File(uri);
  const file = new File(Paths.cache, fileName);
  printed.moveSync(file, { overwrite: true });
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Exporter le classeur',
  });
}
