/** Taux de change (Données de référence). */
import { max, min, sql } from 'drizzle-orm';

import type { IsoDate } from '@/domain/dates';
import type { ExchangeRate } from '@/domain/exchangeRates';

import { chunks } from './chunks';
import type { AppDatabase } from './database';
import { exchangeRate, priceRecord } from './schema';

/** Les dates du premier et du dernier taux enregistrés. */
export function storedRateSpan(db: AppDatabase): { first: IsoDate; last: IsoDate } | undefined {
  const row = db
    .select({ first: min(exchangeRate.date), last: max(exchangeRate.date) })
    .from(exchangeRate)
    .get();
  return row?.first && row.last ? { first: row.first, last: row.last } : undefined;
}

/** La date (UTC) du plus ancien Relevé de prix : l'historique à convertir commence là. */
export function earliestPriceRecordDate(db: AppDatabase): IsoDate | undefined {
  const row = db
    .select({ first: min(priceRecord.recordedAt) })
    .from(priceRecord)
    .get();
  return row?.first?.slice(0, 10);
}

/**
 * Enregistre des taux, un seul par jour et par paire. Frankfurter, la source
 * principale, remplace un taux de secours ; un taux de secours ne remplace
 * jamais un taux déjà connu.
 */
export function saveExchangeRates(db: AppDatabase, rates: ExchangeRate[]): void {
  db.transaction((tx) => {
    for (const rows of chunks(rates)) {
      tx.insert(exchangeRate)
        .values(rows)
        .onConflictDoUpdate({
          target: [exchangeRate.baseCurrency, exchangeRate.quoteCurrency, exchangeRate.date],
          set: { rate: sql`excluded.rate`, source: sql`excluded.source` },
          setWhere: sql`excluded.source = 'frankfurter'`,
        })
        .run();
    }
  });
}
