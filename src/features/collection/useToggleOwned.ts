import { useCallback } from 'react';

import { toggleOwned } from '@/domain/collection';
import type { GridPrinting } from '@/ui/printing-grid/gridPrinting';
import { useToast } from '@/ui/Toast';

import { useSetOwnedQuantity } from './useSetOwnedQuantity';

/** Ce que le ✓ doit savoir d'une case de grille. */
export type OwnedToggleTarget = Pick<GridPrinting, 'printingCode' | 'ownedQuantity' | 'inCatalog'>;

/**
 * ✓ d'une case de grille (spec § 2.1) : bascule possédée ×1 / non possédée.
 * Une Version possédée en plusieurs exemplaires revient à 0, avec le toast
 * « Retirée de la collection (×n) · Annuler », comme une Version inconnue.
 */
export function useToggleOwned(): (printing: OwnedToggleTarget) => void {
  const setOwnedQuantity = useSetOwnedQuantity();
  const showToast = useToast();
  return useCallback(
    ({ printingCode, ownedQuantity, inCatalog }) => {
      const { quantity, undoQuantity } = toggleOwned(ownedQuantity, inCatalog);
      setOwnedQuantity(printingCode, quantity);
      if (undoQuantity === null) return;
      showToast({
        message: `Retirée de la collection (×${undoQuantity})`,
        actionLabel: 'Annuler',
        onAction: () => setOwnedQuantity(printingCode, undoQuantity),
      });
    },
    [setOwnedQuantity, showToast],
  );
}
