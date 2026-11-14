import { useCallback } from 'react';

import { useDatabase } from '@/data/DatabaseProvider';
import { restoreWishlistEntry, setWishlisted } from '@/data/wishlist';
import { useClock } from '@/ui/ClockContext';
import type { GridPrinting } from '@/ui/printing-grid/gridPrinting';
import { useToast } from '@/ui/Toast';

/** Ce que le ♡ doit savoir d'une case de grille. */
export type WishlistToggleTarget = Pick<
  GridPrinting,
  'printingCode' | 'wishlistedAt' | 'inCatalog'
>;

/**
 * ♡ d'une case de grille (spec § 2.1) : ajoute la Version à la Liste de
 * souhaits, datée de maintenant, ou l'en retire. Une Version inconnue retirée
 * a le toast « Retirée des souhaits · Annuler » : sans fiche ni case dans le
 * Catalogue, on ne pourrait plus la remettre en souhait.
 */
export function useToggleWishlisted(): (printing: WishlistToggleTarget) => void {
  const db = useDatabase();
  const now = useClock();
  const showToast = useToast();
  return useCallback(
    ({ printingCode, wishlistedAt, inCatalog }) => {
      const removed = setWishlisted(
        db,
        printingCode,
        wishlistedAt === null ? now().toISOString() : null,
      );
      if (removed === null || inCatalog) return;
      showToast({
        message: 'Retirée des souhaits',
        actionLabel: 'Annuler',
        onAction: () => restoreWishlistEntry(db, removed),
      });
    },
    [db, now, showToast],
  );
}
