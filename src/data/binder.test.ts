import type { PrintingCode } from '@/domain/printingCode';

import { addToBinderSelection, readBinderSelection, removeFromBinderSelection } from './binder';
import { setInBinderSelection } from './printingDetail';
import { createTestDatabase } from './testing/createTestDatabase';

const code = (i: number) => `OGN-${String(i).padStart(3, '0')}` as PrintingCode;

describe('Sélection du classeur', () => {
  it('démarre vide', async () => {
    const { db } = await createTestDatabase();

    expect(readBinderSelection(db)).toEqual(new Set());
  });

  it('ajoute en masse les résultats des filtres, puis « Annuler » ne retire que les nouvelles', async () => {
    const { db } = await createTestDatabase();
    setInBinderSelection(db, code(1), true);
    // Au-delà d'une tranche de requête, pour vérifier le découpage.
    const results = Array.from({ length: 250 }, (_, i) => code(i + 1));

    const added = addToBinderSelection(db, results);
    expect(added).toHaveLength(249);
    expect(added).not.toContain(code(1));
    expect(readBinderSelection(db).size).toBe(250);

    removeFromBinderSelection(db, added);
    expect(readBinderSelection(db)).toEqual(new Set([code(1)]));
  });
});
