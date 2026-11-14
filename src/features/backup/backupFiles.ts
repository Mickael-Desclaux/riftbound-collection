/**
 * Fichiers de Sauvegarde sur le téléphone (expo-file-system, expo-sharing,
 * expo-document-picker). Aucune règle ici : le format est dans `domain/backup`.
 */
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { SafetyBackupKind, SafetyBackupStore } from '@/data/backup';

/** Écrit la Sauvegarde dans le cache de l'app, puis ouvre la fenêtre de partage. */
export async function shareBackupFile(text: string, fileName: string): Promise<void> {
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  await file.write(text);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Exporter une sauvegarde',
  });
}

/**
 * Fait choisir un fichier et rend son texte, ou `null` si l'utilisateur
 * renonce. Tous les types sont proposés : selon l'appli qui le range, un
 * `.json` n'est pas toujours annoncé comme tel ; la lecture dira si c'en est un.
 */
export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;
  return new File(asset.uri).text();
}

/** Les Sauvegardes de sécurité, dans le dossier privé de l'app. */
function safetyBackupFile(kind: SafetyBackupKind): File {
  return new File(new Directory(Paths.document, 'safety-backups'), `${kind}.json`);
}

export const fileSystemSafetyBackups: SafetyBackupStore = {
  async read(kind) {
    const file = safetyBackupFile(kind);
    return file.exists ? file.text() : null;
  },
  async has(kind) {
    return safetyBackupFile(kind).exists;
  },
  async write(kind, text) {
    const file = safetyBackupFile(kind);
    file.parentDirectory.create({ intermediates: true, idempotent: true });
    // Écrite à côté puis renommée : une écriture interrompue ne remplace jamais la précédente.
    const pending = new File(file.parentDirectory, `${kind}.json.tmp`);
    pending.create({ overwrite: true });
    await pending.write(text);
    pending.moveSync(file, { overwrite: true });
  },
  async remove(kind) {
    const file = safetyBackupFile(kind);
    if (file.exists) file.delete();
  },
};
