import { useCallback } from 'react';

import { useDatabase } from '@/data/DatabaseProvider';
import { restoreWishlistEntry, type WishlistEntry } from '@/data/wishlist';
import { useToast } from '@/ui/Toast';

/** Le toast « Retirée des souhaits · Annuler », qui rétablit le souhait tel quel. */
export function useWishlistUndoToast(): (removed: WishlistEntry) => void {
  const db = useDatabase();
  const showToast = useToast();
  return useCallback(
    (removed) =>
      showToast({
        message: 'Retirée des souhaits',
        actionLabel: 'Annuler',
        onAction: () => restoreWishlistEntry(db, removed),
      }),
    [db, showToast],
  );
}
