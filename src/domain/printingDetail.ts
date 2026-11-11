/** Règles de la fiche d'une Version (spec § 2.2). */
import type { IsoDate, IsoDateTime } from './dates';
import type { ExchangeRate } from './exchangeRates';
import {
  FINISHES,
  PRICE_SOURCES,
  SOURCE_CURRENCY,
  type Currency,
  type Finish,
  type PriceSource,
} from './price';
import { currentRate, referenceFinish } from './priceDisplay';

/** Un prix du jour, dans la devise d'origine de sa source. */
export type SourcePrice = { value: number | null; currency: Currency; publishedAt: IsoDateTime };

/** Les prix du jour d'une Version, par Source de prix puis par Finition. */
export type DetailPrices = Partial<Record<PriceSource, Partial<Record<Finish, SourcePrice>>>>;

/** Une case de prix de la fiche : une Source de prix × une Finition. */
export type PriceCell = {
  source: PriceSource;
  finish: Finish;
  /** Prix d'origine (`null` : « — »). */
  original: number | null;
  currency: Currency;
  /** Prix dans la Devise d'affichage, au dernier taux connu. */
  converted: number | null;
  /** Date de publication de la source ; `null` sans prix. */
  publishedAt: IsoDateTime | null;
  /** Date du taux appliqué ; `null` sans conversion. */
  rateDate: IsoDate | null;
};

/** Une case par Source de prix × Finition dans laquelle la Version existe, même sans prix. */
export function priceCells(
  finishes: readonly Finish[],
  prices: DetailPrices,
  displayCurrency: Currency,
  rates: readonly ExchangeRate[],
): PriceCell[] {
  const existing = FINISHES.filter((finish) => finishes.includes(finish));
  return PRICE_SOURCES.flatMap((source) =>
    existing.map((finish): PriceCell => {
      const price = prices[source]?.[finish];
      const currency = price?.currency ?? SOURCE_CURRENCY[source];
      const original = price?.value ?? null;
      const rate = currentRate(currency, displayCurrency, rates);
      return {
        source,
        finish,
        original,
        currency,
        converted: original !== null && rate ? original * rate.rate : null,
        publishedAt: price?.publishedAt ?? null,
        rateDate: original !== null ? (rate?.date ?? null) : null,
      };
    }),
  );
}

/** Une case de prix désignée par sa Source de prix et sa Finition. */
export type CellKey = Pick<PriceCell, 'source' | 'finish'>;

/** La case affichée à l'ouverture : Source de prix des Réglages × Finition de référence. */
export function defaultCell(
  finishes: readonly Finish[],
  priceSource: PriceSource,
): CellKey | undefined {
  const finish = referenceFinish(finishes);
  return finish && { source: priceSource, finish };
}

/** Page produit de la Version sur une Source de prix ; `null` sans identifiant. */
export function productUrl(
  source: PriceSource,
  ids: { tcgId: number | null; cardmarketProductId: number | null },
): string | null {
  if (source === 'tcgplayer') {
    return ids.tcgId === null ? null : `https://www.tcgplayer.com/product/${ids.tcgId}`;
  }
  return ids.cardmarketProductId === null
    ? null
    : `https://www.cardmarket.com/en/Riftbound/Products?idProduct=${ids.cardmarketProductId}`;
}
