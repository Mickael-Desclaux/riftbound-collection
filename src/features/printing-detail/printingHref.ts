import type { PrintingCode } from '@/domain/printingCode';

/** Les onglets qui ont leur propre pile, et donc leur propre fiche. */
export type PrintingTab = 'catalog' | 'collection' | 'wishlist';

/** Lien vers la fiche d'une Version, dans la pile de l'onglet `tab`. */
export function printingHref(tab: PrintingTab, printingCode: PrintingCode) {
  return { pathname: `/${tab}/[printingCode]` as const, params: { printingCode } };
}
