import type { PrintingCode } from '@/domain/printingCode';

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
export function gridImageUri(printing: GridPrinting): string | null {
  return printing.imageNormal ?? printing.imageSmall;
}
