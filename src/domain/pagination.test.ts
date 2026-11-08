import { PAGE_SIZE, pageCount, paginationItems } from './pagination';

describe('paginationItems', () => {
  it('montre la première, la dernière et les voisines de la page courante', () => {
    expect(paginationItems(5, 72)).toEqual([1, 'gap', 4, 5, 6, 'gap', 72]);
  });

  it.each([
    [1, 72, [1, 2, 'gap', 72]],
    [72, 72, [1, 'gap', 71, 72]],
    [1, 1, [1]],
    [2, 3, [1, 2, 3]],
    [3, 5, [1, 2, 3, 4, 5]],
  ])('page %i sur %i', (current, count, expected) => {
    expect(paginationItems(current, count)).toEqual(expected);
  });
});

describe('pageCount', () => {
  it('compte 24 Versions par page', () => {
    expect(PAGE_SIZE).toBe(24);
    expect(pageCount(1725)).toBe(72);
    expect(pageCount(24)).toBe(1);
    expect(pageCount(25)).toBe(2);
  });

  it('garde une page même sans résultat', () => {
    expect(pageCount(0)).toBe(1);
  });
});
