import type { NewExpansion } from '@/sync/syncAll';

/** « A », « A et B », « A, B et C ». */
function namesOf(expansions: readonly NewExpansion[]): string {
  const names = expansions.map((e) => e.name);
  const last = names.pop();
  return names.length === 0 ? (last ?? '') : `${names.join(', ')} et ${last}`;
}

/** Le titre du message et de la notification. */
export function newExpansionsTitle(expansions: readonly NewExpansion[]): string {
  return expansions.length > 1 ? 'Nouvelles extensions' : 'Nouvelle extension';
}

/** La phrase du message et de la notification. */
export function newExpansionsText(expansions: readonly NewExpansion[]): string {
  const verb = expansions.length > 1 ? 'sont arrivées' : 'est arrivée';
  return `${namesOf(expansions)} ${verb} dans le catalogue.`;
}
