import { useCallback } from 'react';

import { setOwnedQuantity } from '@/data/collection';
import { useDatabase } from '@/data/DatabaseProvider';
import { toggleOwned } from '@/domain/collection';
import type { PrintingCode } from '@/domain/printingCode';
import { useToast } from '@/ui/Toast';

/**
 * ✓ d'une case de grille (spec § 2.1) : bascule possédée ×1 / non possédée.
 * Une Version possédée en plusieurs exemplaires revient à 0, avec le toast
 * « Retirée de la collection (×n) · Annuler ».
 */
export function useToggleOwned(): (printing: {
  printingCode: PrintingCode;
  ownedQuantity: number;
}) => void {
  const db = useDatabase();
  const showToast = useToast();
  return useCallback(
    ({ printingCode, ownedQuantity }) => {
      const { quantity, undoQuantity } = toggleOwned(ownedQuantity);
      setOwnedQuantity(db, printingCode, quantity);
      if (undoQuantity === null) return;
      showToast({
        message: `Retirée de la collection (×${undoQuantity})`,
        actionLabel: 'Annuler',
        onAction: () => setOwnedQuantity(db, printingCode, undoQuantity),
      });
    },
    [db, showToast],
  );
}
