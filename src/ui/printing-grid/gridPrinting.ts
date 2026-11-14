import type { IsoDateTime } from '@/domain/dates';
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
  /** Quantité dans la Collection : badge « ×n » au-dessus de 0. */
  ownedQuantity: number;
  /** Faux pour une Version inconnue (absente du Catalogue) : cadre gris. */
  inCatalog: boolean;
  /** Date d'ajout à la Liste de souhaits : ♡ plein si elle n'est pas `null`. */
  wishlistedAt: IsoDateTime | null;
  /** Variation de prix depuis l'ajout aux souhaits, en % (`null` : pas de relevé). */
  wishlistPriceChange: number | null;
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
