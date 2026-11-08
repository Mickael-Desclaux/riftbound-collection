/** Réponses RiftHunt enregistrées, servies par URL au faux `fetch` des tests. */
import page1 from '../__fixtures__/cards-page-1.json';
import page2 from '../__fixtures__/cards-page-2.json';
import sets from '../__fixtures__/sets.json';
import { RIFTHUNT_SETS_URL, rifthuntCatalogPageUrl } from '../rifthunt';

export { page1, page2, sets };
export const SETS_URL = RIFTHUNT_SETS_URL;
export const pageUrl = rifthuntCatalogPageUrl;

/** `/sets` et les deux pages du Catalogue enregistrées. */
export const rifthuntResponses = {
  [SETS_URL]: { body: sets },
  [pageUrl(1)]: { body: page1 },
  [pageUrl(2)]: { body: page2 },
};

/** `/sets` où une Extension a changé de `card_count`. */
export function setsWithCardCount(code: string, cardCount: number) {
  return {
    ...sets,
    data: sets.data.map((set) => (set.code === code ? { ...set, card_count: cardCount } : set)),
  };
}
