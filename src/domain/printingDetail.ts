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
import { convertCurrentPrice, currentRate, referenceFinish } from './priceDisplay';

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
      const rate = original === null ? undefined : currentRate(currency, displayCurrency, rates);
      return {
        source,
        finish,
        original,
        currency,
        converted: convertCurrentPrice(original, currency, displayCurrency, rates),
        publishedAt: price?.publishedAt ?? null,
        rateDate: rate?.date ?? null,
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

/** Identifiants de la Version chez chaque Source de prix. */
type ProductIds = { tcgId: number | null; cardmarketProductId: number | null };

const PRODUCT_URLS: Record<PriceSource, (ids: ProductIds) => string | null> = {
  tcgplayer: ({ tcgId }) => (tcgId === null ? null : `https://www.tcgplayer.com/product/${tcgId}`),
  cardmarket: ({ cardmarketProductId: id }) =>
    id === null ? null : `https://www.cardmarket.com/en/Riftbound/Products?idProduct=${id}`,
};

/** Page produit de la Version sur une Source de prix ; `null` sans identifiant. */
export function productUrl(source: PriceSource, ids: ProductIds): string | null {
  return PRODUCT_URLS[source](ids);
}
