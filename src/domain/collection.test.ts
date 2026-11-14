import { collectionEntries, toggleOwned } from './collection';
import type { PrintingCode } from './printingCode';
import { entry } from './testing/catalogEntries';

const code = (value: string) => value as PrintingCode;

describe('toggleOwned', () => {
  it('marque une Version non possédée ×1, sans rien à annuler', () => {
    expect(toggleOwned(0, true)).toEqual({ quantity: 1, undoQuantity: null });
  });

  it('retire une Version possédée ×1, sans toast', () => {
    expect(toggleOwned(1, true)).toEqual({ quantity: 0, undoQuantity: null });
  });

  it('remet à 0 une Version possédée ×n, en gardant n pour « Annuler »', () => {
    expect(toggleOwned(3, true)).toEqual({ quantity: 0, undoQuantity: 3 });
  });

  it('propose toujours « Annuler » pour une Version inconnue : on ne pourrait plus la remettre', () => {
    expect(toggleOwned(1, false)).toEqual({ quantity: 0, undoQuantity: 1 });
  });
});

describe('collectionEntries', () => {
  it('garde les Versions possédées, avec leur quantité', () => {
    const entries = [
      entry('OGN-001', { ownedQuantity: 2 }),
      entry('OGN-002'),
      entry('OGN-003', { ownedQuantity: 1 }),
    ];
    const owned = new Map([
      [code('OGN-001'), 2],
      [code('OGN-003'), 1],
    ]);

    const result = collectionEntries(entries, owned);

    expect(result.map((e) => [e.printingCode, e.ownedQuantity])).toEqual([
      ['OGN-001', 2],
      ['OGN-003', 1],
    ]);
    expect(result.every((e) => e.inCatalog)).toBe(true);
  });

  it('ajoute les Versions inconnues : possédées mais absentes du Catalogue, sans prix', () => {
    const owned = new Map([
      [code('OGN-001'), 1],
      [code('OPP-099-298'), 4],
    ]);

    const unknown = collectionEntries([entry('OGN-001', { ownedQuantity: 1 })], owned).find(
      (e) => !e.inCatalog,
    );

    expect(unknown).toMatchObject({
      printingCode: 'OPP-099-298',
      name: 'OPP-099-298',
      expansionCode: 'OPP',
      isPromo: true,
      ownedQuantity: 4,
      price: null,
      imageNormal: null,
    });
  });
});
