import { useCallback } from 'react';

import { setOwnedQuantity } from '@/data/collection';
import { useDatabase } from '@/data/DatabaseProvider';
import type { PrintingCode } from '@/domain/printingCode';
import { useWishlistUndoToast } from '@/features/wishlist/useWishlistUndoToast';

/**
 * Règle la quantité possédée d'une Version, depuis n'importe quel écran. Une
 * Version qui passe de 0 à au moins 1 exemplaire quitte la Liste de souhaits,
 * avec le toast « Retirée des souhaits · Annuler » (spec § 2.4).
 */
export function useSetOwnedQuantity(): (printingCode: PrintingCode, quantity: number) => void {
  const db = useDatabase();
  const showUndoToast = useWishlistUndoToast();
  return useCallback(
    (printingCode, quantity) => {
      const removed = setOwnedQuantity(db, printingCode, quantity);
      if (removed !== null) showUndoToast(removed);
    },
    [db, showUndoToast],
  );
}
