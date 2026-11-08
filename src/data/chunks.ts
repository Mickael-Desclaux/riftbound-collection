/** Lignes par requête, pour rester loin de la limite de paramètres de SQLite. */
const CHUNK = 100;

/** Découpe `items` en tranches de taille raisonnable pour une requête. */
export function chunks<T>(items: T[]): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += CHUNK) result.push(items.slice(i, i + CHUNK));
  return result;
}
