import type { SafetyBackupKind, SafetyBackupStore } from '@/data/backup';

/** Sauvegardes de sécurité gardées en mémoire ; `failWrites` simule un disque plein. */
export function memorySafetyBackups(options: { failWrites?: boolean } = {}) {
  const files = new Map<SafetyBackupKind, string>();
  const store: SafetyBackupStore = {
    read: async (kind) => files.get(kind) ?? null,
    has: async (kind) => files.has(kind),
    write: async (kind, text) => {
      if (options.failWrites) throw new Error('disque plein');
      files.set(kind, text);
    },
    remove: async (kind) => {
      files.delete(kind);
    },
  };
  return { store, files };
}
