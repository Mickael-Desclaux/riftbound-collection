/** Formatage des nombres et libellés partagés par les écrans. */

const formatInteger = new Intl.NumberFormat('fr-FR').format;

/** « 1 version », « 1 725 versions ». */
export function formatPrintingCount(count: number): string {
  return `${formatInteger(count)} ${count > 1 ? 'versions' : 'version'}`;
}
