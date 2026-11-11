import { createContext, useContext } from 'react';

/** L'horloge, créée à la racine de composition (`AppCatalogGate`) comme `fetch` et la base. */
export const ClockContext = createContext<(() => Date) | null>(null);

export function useClock(): () => Date {
  const now = useContext(ClockContext);
  if (!now) throw new Error('useClock : aucune horloge fournie (ClockContext).');
  return now;
}
