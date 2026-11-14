/**
 * Synchronisation des taux de change (spec § 3, § 5) : au plus une fois par
 * jour (UTC), même au tirer-pour-rafraîchir, car la BCE ne publie qu'un taux par
 * jour ouvré. Les taux couvrent tout l'historique de prix, pour convertir chaque
 * Relevé au taux de sa date. Frankfurter d'abord, la Banque du Canada s'il échoue.
 */
import { firstFallbackRateDate, saveExchangeRates, storedRateRange } from '@/data/exchangeRates';
import { earliestPriceRecordDate } from '@/data/prices';
import { getSourceState, type SourceState } from '@/data/sourceState';
import { addDays, toIsoDate, type DateRange, type IsoDate } from '@/domain/dates';
import type { ExchangeRate, ExchangeRateSource } from '@/domain/exchangeRates';
import { fetchBankOfCanadaRates } from '@/sources/bank-of-canada/bankOfCanada';
import { fetchFrankfurterRates } from '@/sources/frankfurter/frankfurter';
import { SourceError, type Fetch } from '@/sources/http';

import type { SyncDeps } from './catalog';
import { hasPendingError, recorded } from './schedule';

/** `skipped` : déjà fait aujourd'hui ; `refreshed` : taux enregistrés. */
export type ExchangeRateSyncOutcome = 'skipped' | 'refreshed';

/** Ce que doit fournir une source : les taux de la plage, plus le dernier qui la précède. */
type RateSource = {
  id: ExchangeRateSource;
  fetchRates: (fetch: Fetch, start: IsoDate, end: IsoDate) => Promise<ExchangeRate[]>;
};

/** Dans l'ordre de préférence. */
const RATE_SOURCES: RateSource[] = [
  { id: 'frankfurter', fetchRates: fetchFrankfurterRates },
  { id: 'bank-of-canada', fetchRates: fetchBankOfCanadaRates },
];

export async function syncExchangeRates(
  { db, fetch, now }: SyncDeps,
  /** `refresh` : vérifie les taux même s'ils l'ont déjà été aujourd'hui. */
  { refresh = false }: { refresh?: boolean } = {},
): Promise<ExchangeRateSyncOutcome> {
  const at = now();
  const today = toIsoDate(at);
  const state = getSourceState(db, 'exchange-rates');
  if (!refresh && !hasPendingError(state) && succeededOn(state, today)) return 'skipped';

  return recorded(db, 'exchange-rates', at, async () => {
    const earliest = earliestPriceRecordDate(db);
    const ranges = missingRanges(
      storedRateRange(db),
      // Un jour plus tôt : la date UTC d'un Relevé peut devancer sa date locale.
      earliest ? addDays(earliest, -1) : today,
      firstFallbackRateDate(db),
      today,
    );
    const { source, rates } = await fetchWithFallback(fetch, ranges);
    saveExchangeRates(db, source, ranges, rates);
    return 'refreshed' as const;
  });
}

/** Vrai si la dernière réussite date de ce jour (UTC). */
function succeededOn(state: SourceState | undefined, today: IsoDate): boolean {
  return !!state?.lastSuccessAt && toIsoDate(new Date(state.lastSuccessAt)) === today;
}

/**
 * Les plages à demander :
 * - avant le premier taux connu, si l'historique de prix remonte plus loin ;
 * - depuis le dernier taux connu jusqu'à aujourd'hui, ou depuis le premier taux
 *   de secours, pour que la source principale le remplace dès qu'elle répond.
 * Chaque source renvoie aussi le dernier taux qui précède le début d'une plage.
 */
function missingRanges(
  stored: DateRange | undefined,
  neededFrom: IsoDate,
  firstFallback: IsoDate | undefined,
  today: IsoDate,
): DateRange[] {
  if (!stored) return [{ start: neededFrom, end: today }];
  const ranges: DateRange[] = [];
  if (neededFrom < stored.start) ranges.push({ start: neededFrom, end: stored.start });
  const from = firstFallback && firstFallback < stored.end ? firstFallback : stored.end;
  ranges.push({ start: from, end: today });
  return ranges;
}

/** Toutes les plages auprès d'une même source, la première qui répond. */
async function fetchWithFallback(
  fetch: Fetch,
  ranges: DateRange[],
): Promise<{ source: ExchangeRateSource; rates: ExchangeRate[] }> {
  const errors: unknown[] = [];
  for (const { id, fetchRates } of RATE_SOURCES) {
    try {
      const rates = await Promise.all(
        ranges.map(({ start, end }) => fetchRates(fetch, start, end)),
      );
      return { source: id, rates: rates.flat() };
    } catch (error) {
      errors.push(error);
    }
  }
  throw combinedError(errors);
}

/** Une seule erreur qui cite chaque source ; son type est celui de la dernière tentative. */
function combinedError(errors: unknown[]): unknown {
  const last = errors.at(-1);
  if (!errors.every((e) => e instanceof SourceError)) return last;
  const sourceErrors = errors as SourceError[];
  return new SourceError(
    (last as SourceError).kind,
    `Taux de change indisponibles. ${sourceErrors
      .map((e, i) => `${RATE_SOURCES[i]?.id} : ${e.message}`)
      .join(' ')}`,
    sourceErrors
      .map((e) => e.details)
      .filter(Boolean)
      .join('\n'),
  );
}
