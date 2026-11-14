import type { PrintingCode } from '@/domain/printingCode';

/** Les onglets qui ont leur propre pile, et donc leur propre fiche. */
export type PrintingTab = 'catalog' | 'collection' | 'wishlist';

/** Lien vers la fiche d'une Version, dans la pile de l'onglet `tab`. */
export function printingHref(tab: PrintingTab, printingCode: PrintingCode) {
  return { pathname: `/${tab}/[printingCode]` as const, params: { printingCode } };
}

/**
 * Lien vers le Catalogue filtré sur une Extension et « Manquantes » (spec § 2.3).
 * `requestedAt` distingue deux touchers sur la même ligne : le second réapplique
 * le filtre, même si l'utilisateur l'a changé entre-temps.
 */
export function missingInExpansionHref(expansionCode: string, requestedAt: Date) {
  return {
    pathname: '/catalog' as const,
    params: { missingIn: expansionCode, requestedAt: String(requestedAt.getTime()) },
  };
}

/** Les paramètres de `missingInExpansionHref`, tels que le Catalogue les reçoit. */
export type MissingInExpansionParams = { missingIn?: string; requestedAt?: string };
