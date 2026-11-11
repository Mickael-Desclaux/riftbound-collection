/** Taux de change (Données de référence). */
import { and, between, max, min, ne, or, sql } from 'drizzle-orm';

import type { DateRange, IsoDate } from '@/domain/dates';
import {
  PRIMARY_RATE_SOURCE,
  type ExchangeRate,
  type ExchangeRateSource,
} from '@/domain/exchangeRates';

import { chunks } from './chunks';
import type { AppDatabase } from './database';
import { exchangeRate } from './schema';

/** Les dates du premier et du dernier taux enregistrés. */
export function storedRateRange(db: AppDatabase): DateRange | undefined {
  const row = db
    .select({ start: min(exchangeRate.date), end: max(exchangeRate.date) })
    .from(exchangeRate)
    .get();
  return row?.start && row.end ? { start: row.start, end: row.end } : undefined;
}

/** La date du premier taux qui ne vient pas de la source principale. */
export function firstFallbackRateDate(db: AppDatabase): IsoDate | undefined {
  return (
    db
      .select({ date: min(exchangeRate.date) })
      .from(exchangeRate)
      .where(ne(exchangeRate.source, PRIMARY_RATE_SOURCE))
      .get()?.date ?? undefined
  );
}

/**
 * Enregistre les taux d'une source pour les plages demandées, un seul par jour
 * et par paire. La source principale remplace tous les taux de secours de ces
 * plages, pour ne pas mélanger deux sources dans une même série ; un taux de
 * secours ne remplace jamais un taux déjà connu.
 */
export function saveExchangeRates(
  db: AppDatabase,
  source: ExchangeRateSource,
  ranges: DateRange[],
  rates: ExchangeRate[],
): void {
  const isPrimary = source === PRIMARY_RATE_SOURCE;
  db.transaction((tx) => {
    if (isPrimary && ranges.length > 0) {
      tx.delete(exchangeRate)
        .where(
          and(
            ne(exchangeRate.source, PRIMARY_RATE_SOURCE),
            or(...ranges.map(({ start, end }) => between(exchangeRate.date, start, end))),
          ),
        )
        .run();
    }
    for (const rows of chunks(rates)) {
      const insert = tx.insert(exchangeRate).values(rows);
      if (isPrimary) {
        insert
          .onConflictDoUpdate({
            target: [exchangeRate.baseCurrency, exchangeRate.quoteCurrency, exchangeRate.date],
            set: { rate: sql`excluded.rate`, source: sql`excluded.source` },
          })
          .run();
      } else {
        insert.onConflictDoNothing().run();
      }
    }
  });
}

export function readExchangeRates(db: AppDatabase): ExchangeRate[] {
  return db.select().from(exchangeRate).all();
}
