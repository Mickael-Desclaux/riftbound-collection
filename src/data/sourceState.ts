/** Dernière réussite et dernière erreur de chaque source. */
import { eq } from 'drizzle-orm';

import type { IsoDateTime } from '@/domain/dates';

import type { AppDatabase } from './database';
import { sourceState, type SourceId } from './schema';

export type SourceState = typeof sourceState.$inferSelect;

export function getSourceState(db: AppDatabase, source: SourceId): SourceState | undefined {
  return db.select().from(sourceState).where(eq(sourceState.source, source)).get();
}

export function recordSourceSuccess(db: AppDatabase, source: SourceId, at: IsoDateTime): void {
  db.insert(sourceState)
    .values({ source, lastSuccessAt: at })
    .onConflictDoUpdate({ target: sourceState.source, set: { lastSuccessAt: at } })
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
