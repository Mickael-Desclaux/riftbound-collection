/** Dernière réussite et dernière erreur de chaque source. */
import { eq } from 'drizzle-orm';

import type { IsoDateTime } from '@/domain/dates';

import type { AppDatabase } from './database';
import { sourceState, type SourceId } from './schema';

export type SourceState = typeof sourceState.$inferSelect;

export function getSourceState(db: AppDatabase, source: SourceId): SourceState | undefined {
  return db.select().from(sourceState).where(eq(sourceState.source, source)).get();
}

/** Note une réussite ; `lastModified` n'est remplacé que s'il est fourni. */
export function recordSourceSuccess(
  db: AppDatabase,
  source: SourceId,
  at: IsoDateTime,
  { lastModified }: { lastModified?: string | null } = {},
): void {
  const set =
    lastModified === undefined ? { lastSuccessAt: at } : { lastSuccessAt: at, lastModified };
  db.insert(sourceState)
    .values({ source, ...set })
    .onConflictDoUpdate({ target: sourceState.source, set })
    .run();
}

export function recordSourceFailure(
  db: AppDatabase,
  source: SourceId,
  at: IsoDateTime,
  message: string,
): void {
  db.insert(sourceState)
    .values({ source, lastErrorAt: at, lastErrorMessage: message })
    .onConflictDoUpdate({
      target: sourceState.source,
      set: { lastErrorAt: at, lastErrorMessage: message },
    })
    .run();
}
