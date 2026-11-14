/**
 * Le classeur en HTML, pour expo-print (spec § 2.5) : la mise en page de la v1,
 * A4 en 3 × 3, marges de 5 mm, en-tête « EXTENSION · page x/y », image ≈ 83 mm.
 */
import type { BinderPage } from '@/domain/binder';
import type { CatalogEntry } from '@/domain/catalogEntry';
import type { IsoDateTime } from '@/domain/dates';
import type { Currency } from '@/domain/price';
import type { PrintingCode } from '@/domain/printingCode';
import { formatDate, formatPrice } from '@/ui/format';
import { VARIANTS } from '@/ui/labels';

export type BinderHtmlOptions = {
  /** Nom de chaque Extension, par code ; à défaut, le code. */
  expansionNames: ReadonlyMap<string, string>;
  /** « Afficher les prix » : prix du jour, date en pied de page. */
  showPrices: boolean;
  /** « Marquer les cartes possédées » : bordure verte. */
  markOwned: boolean;
  displayCurrency: Currency;
  /** Date des prix du jour (`null` : aucun prix). */
  priceDate: IsoDateTime | null;
  /** Grande image de chaque Version, en `data:` ; absente : un cadre la remplace. */
  images: ReadonlyMap<PrintingCode, string>;
};

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);

const STYLE = `
@page { size: A4 portrait; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; }
body { font-family: sans-serif; color: #1c2940; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.sheet { width: 210mm; height: 297mm; padding: 5mm; display: flex; flex-direction: column; overflow: hidden; break-after: page; page-break-after: always; }
.sheet:last-child { break-after: auto; page-break-after: auto; }
.head { flex: 0 0 7mm; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #d8e0e8; margin-bottom: 1mm; padding: 0 1mm 1mm; }
.title { font-size: 12pt; font-weight: 800; letter-spacing: 0.4px; color: #19284d; text-transform: uppercase; }
.meta { font-size: 7.5pt; color: #5d6a7d; white-space: nowrap; }
.grid { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-template-rows: repeat(3, minmax(0, 1fr)); gap: 1.4mm; }
.card { min-width: 0; min-height: 0; border: 0.25mm solid #d9e0e8; border-radius: 1.3mm; padding: 1mm 0.8mm 0.7mm; display: flex; flex-direction: column; align-items: center; overflow: hidden; }
.card.owned { border: 1.1mm solid #20a34a; }
.art { flex: 1 1 auto; min-height: 0; width: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.art img { display: block; max-width: 100%; max-height: 83mm; object-fit: contain; }
.missing { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; text-align: center; color: #9b2c2c; font-size: 8pt; border: 1px dashed #d9b4b4; }
.caption { flex: 0 0 8mm; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 0.4mm; text-align: center; }
.name { width: 100%; font-size: 8pt; line-height: 1.05; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.line { margin-top: 0.5mm; display: flex; justify-content: center; gap: 2mm; font-size: 6.7pt; line-height: 1.05; color: #536176; white-space: nowrap; }
.variant { color: #68778b; text-transform: uppercase; }
.price { font-size: 8pt; font-weight: 800; color: #147b78; }
.foot { flex: 0 0 4mm; padding-top: 1mm; font-size: 6.5pt; color: #5d6a7d; text-align: right; }
`;

function cardHtml(printing: CatalogEntry, options: BinderHtmlOptions): string {
  const image = options.images.get(printing.printingCode);
  const name = escapeHtml(printing.name);
  const art = image
    ? `<img src="${image}" alt="${name}">`
    : '<div class="missing">Image indisponible</div>';
  const owned = options.markOwned && printing.ownedQuantity > 0 ? ' owned' : '';
  const price = options.showPrices
    ? `<span class="price">${escapeHtml(formatPrice(printing.price, options.displayCurrency))}</span>`
    : '';
  const variant = printing.inCatalog
    ? `<span class="variant">${escapeHtml(VARIANTS[printing.variant])}</span>`
    : '';
  return `<div class="card${owned}"><div class="art">${art}</div><div class="caption"><div class="name">${name}</div><div class="line"><span>${escapeHtml(printing.printingCode)}</span>${variant}${price}</div></div></div>`;
}

function pageHtml(page: BinderPage, options: BinderHtmlOptions): string {
  const title = escapeHtml(options.expansionNames.get(page.expansionCode) ?? page.expansionCode);
  const foot =
    options.showPrices && options.priceDate
      ? `<div class="foot">Prix du ${escapeHtml(formatDate(options.priceDate))}</div>`
      : '';
  const cards = page.printings.map((printing) => cardHtml(printing, options)).join('');
  return `<section class="sheet"><div class="head"><div class="title">${title}</div><div class="meta">page ${page.number}/${page.count}</div></div><div class="grid">${cards}</div>${foot}</section>`;
}

/** Le document complet : une `section` par page A4. */
export function binderHtml(pages: readonly BinderPage[], options: BinderHtmlOptions): string {
  const body = pages.map((page) => pageHtml(page, options)).join('');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${STYLE}</style></head><body>${body}</body></html>`;
}
