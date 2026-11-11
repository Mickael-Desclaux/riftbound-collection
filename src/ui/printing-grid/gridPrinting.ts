import type { PrintingCode } from '@/domain/printingCode';

/** Format des cartes Riftbound (largeur / hauteur). */
export const CARD_ASPECT_RATIO = 744 / 1039;

/** Ce qu'une case de grille affiche. */
export type GridPrinting = {
  printingCode: PrintingCode;
  name: string;
  imageSmall: string | null;
  imageNormal: string | null;
  /** Prix dans la Devise d'affichage ; `null` s'affiche « — ». */
  price: number | null;
};

/**
 * L'image affichée dans la grille : la taille « normal » (480 px), nette sur
 * deux colonnes, ou à défaut la petite. Sert aussi au préchargement.
 */
export function gridImageUri(
  printing: Pick<GridPrinting, 'imageNormal' | 'imageSmall'>,
): string | null {
  return printing.imageNormal ?? printing.imageSmall;
}
