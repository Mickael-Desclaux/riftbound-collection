/**
 * Synchronisation des taux de change (spec § 3, § 5) : au plus une fois par
 * jour, même au tirer-pour-rafraîchir, car la BCE ne publie qu'un taux par jour
 * ouvré. Les taux couvrent tout l'historique de prix, pour convertir chaque
 * Relevé au taux de sa date. Frankfurter d'abord, la Banque du Canada s'il échoue.
 */
import { earliestPriceRecordDate, saveExchangeRates, storedRateSpan } from '@/data/exchangeRates';
import { getSourceState } from '@/data/sourceState';
import { toIsoDate, type IsoDate } from '@/domain/dates';
import type { ExchangeRate } from '@/domain/exchangeRates';
import { fetchBankOfCanadaRates } from '@/sources/bank-of-canada/bankOfCanada';
import { fetchFrankfurterRates } from '@/sources/frankfurter/frankfurter';
import { SourceError, type Fetch } from '@/sources/http';

import type { SyncDeps } from './catalog';
import { hasPendingError, HOUR, isOlderThan, recorded } from './schedule';

const RATES_MAX_AGE = 24 * HOUR;

/** `skipped` : déjà fait dans les dernières 24 h ; `refreshed` : taux enregistrés. */
export type ExchangeRateSyncOutcome = 'skipped' | 'refreshed';

type DateRange = { start: IsoDate; end: IsoDate };

export async function syncExchangeRates({
  db,
  fetch,
  now,
}: SyncDeps): Promise<ExchangeRateSyncOutcome> {
  const at = now();
  const state = getSourceState(db, 'exchange-rates');
  if (!hasPendingError(state) && !isOlderThan(state, RATES_MAX_AGE, at)) return 'skipped';

  return recorded(db, 'exchange-rates', at, async () => {
    const today = toIsoDate(at);
    const ranges = missingRanges(storedRateSpan(db), earliestPriceRecordDate(db) ?? today, today);
    saveExchangeRates(db, await fetchWithFallback(fetch, ranges));
    return 'refreshed' as const;
  });
}

/**
 * Les plages à demander : avant le premier taux connu si l'historique de prix
 * remonte plus loin, et depuis le dernier taux connu jusqu'à aujourd'hui.
 * Chaque source renvoie aussi le dernier taux qui précède le début d'une plage.
 */
function missingRanges(
  stored: { first: IsoDate; last: IsoDate } | undefined,
  neededFrom: IsoDate,
  today: IsoDate,
): DateRange[] {
  if (!stored) return [{ start: neededFrom, end: today }];
  const ranges: DateRange[] = [];
  if (neededFrom < stored.first) ranges.push({ start: neededFrom, end: stored.first });
  ranges.push({ start: stored.last, end: today });
  return ranges;
}

/** Toutes les plages auprès de Frankfurter ; sinon, toutes auprès de la Banque du Canada. */
async function fetchWithFallback(fetch: Fetch, ranges: DateRange[]): Promise<ExchangeRate[]> {
  const fetchAll = async (
    source: (fetch: Fetch, start: IsoDate, end: IsoDate) => Promise<ExchangeRate[]>,
  ) => {
    const rates: ExchangeRate[] = [];
    for (const { start, end } of ranges) rates.push(...(await source(fetch, start, end)));
    return rates;
  };
  try {
    return await fetchAll(fetchFrankfurterRates);
  } catch (primary) {
    try {
      return await fetchAll(fetchBankOfCanadaRates);
    } catch (fallback) {
      if (!(primary instanceof SourceError && fallback instanceof SourceError)) throw fallback;
      throw new SourceError(
        fallback.kind,
        `Taux de change indisponibles. Frankfurter : ${primary.message} Banque du Canada : ${fallback.message}`,
        [primary.details, fallback.details].filter(Boolean).join('\n'),
      );
    }
  }
}
