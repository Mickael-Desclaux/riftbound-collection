import { binderPages } from '@/domain/binder';
import type { PrintingCode } from '@/domain/printingCode';
import { entry } from '@/domain/testing/catalogEntries';

import { binderHtml, type BinderHtmlOptions } from './binderHtml';

const options: BinderHtmlOptions = {
  expansionNames: new Map([['OGN', 'Origins']]),
  showPrices: true,
  markOwned: true,
  displayCurrency: 'EUR',
  priceDate: '2026-11-14T10:00:00.000Z',
  images: new Map([['OGN-001' as PrintingCode, 'data:image/webp;base64,AAAA']]),
};

const pages = binderPages([
  entry('OGN-001', { name: 'Jinx <Demolitionist>', ownedQuantity: 2, price: 12.4 }),
  entry('OGN-002', { variant: 'showcase' }),
]);

/** Les cases du document, dans l'ordre. */
const cards = (html: string) => html.split('<div class="card').slice(1);

describe('binderHtml', () => {
  it("met en page l'en-tête, les cases et le pied de page des prix", () => {
    const html = binderHtml(pages, options);

    expect(html).toContain('<div class="title">Origins</div>');
    expect(html).toContain('page 1/1');
    expect(html).toContain('Prix du 14 novembre 2026');
    const [jinx, other] = cards(html);
    expect(jinx).toContain(' owned"');
    expect(jinx).toContain('Jinx &lt;Demolitionist&gt;');
    expect(jinx).toContain('<img src="data:image/webp;base64,AAAA"');
    expect(jinx).toContain('12,40');
    expect(other).toContain('Showcase');
    expect(other).toContain('Image indisponible');
  });

  it('sans les options, ni prix, ni bordure des cartes possédées', () => {
    const html = binderHtml(pages, { ...options, showPrices: false, markOwned: false });

    expect(html).not.toContain('class="price"');
    expect(html).not.toContain('Prix du');
    expect(html).not.toContain(' owned"');
  });
});
