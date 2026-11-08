/** Pagination numérotée des grilles (spec § 2.1) : ‹ 1 … 4 5 6 … 72 ›. */

/** Un numéro de page, ou un trou (« … ») entre deux numéros non consécutifs. */
export type PaginationItem = number | 'gap';

export function paginationItems(current: number, pageCount: number): PaginationItem[] {
  const pages = [...new Set([1, current - 1, current, current + 1, pageCount])]
    .filter((page) => page >= 1 && page <= pageCount)
    .sort((a, b) => a - b);
  const items: PaginationItem[] = [];
  let previous = 0;
  for (const page of pages) {
    if (page - previous > 1) items.push('gap');
    items.push(page);
    previous = page;
  }
  return items;
}

/** Versions par page (spec § 2.1). */
export const PAGE_SIZE = 24;

/** Nombre de pages pour `total` Versions ; au moins une, même vide. */
export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}
