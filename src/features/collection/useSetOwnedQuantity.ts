import { useCallback } from 'react';

import { setOwnedQuantity } from '@/data/collection';
import { useDatabase } from '@/data/DatabaseProvider';
import { restoreWishlistEntry } from '@/data/wishlist';
import type { PrintingCode } from '@/domain/printingCode';
import { useToast } from '@/ui/Toast';

/**
 * Règle la quantité possédée d'une Version, depuis n'importe quel écran. Une
 * Version qui passe de 0 à au moins 1 exemplaire quitte la Liste de souhaits,
 * avec le toast « Retirée des souhaits · Annuler » (spec § 2.4).
 */
export function useSetOwnedQuantity(): (printingCode: PrintingCode, quantity: number) => void {
  const db = useDatabase();
  const showToast = useToast();
  return useCallback(
    (printingCode, quantity) => {
      const removed = setOwnedQuantity(db, printingCode, quantity);
      if (removed === null) return;
      showToast({
        message: 'Retirée des souhaits',
        actionLabel: 'Annuler',
        onAction: () => restoreWishlistEntry(db, removed),
      });
    },
    [db, showToast],
  );
}
