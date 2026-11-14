import { useCallback, useEffect, useState } from 'react';

import type { PriceAlert } from '@/domain/priceAlert';
import type { PrintingCode } from '@/domain/printingCode';

import type { Announcer } from './announcer';

/**
 * La pastille d'un onglet (spec § 3 point 10) : le nombre de Versions qui ont
 * donné une Alerte de prix de `announcer` pendant que l'app était ouverte,
 * jusqu'à ce qu'on ouvre l'onglet (`clear`). Souhaits pour les baisses,
 * Collection pour les hausses.
 */
export function usePriceAlertBadge(announcer: Pick<Announcer<PriceAlert>, 'subscribe'>): {
  count: number;
  clear: () => void;
} {
  const [alerted, setAlerted] = useState<ReadonlySet<PrintingCode>>(new Set());

  useEffect(
    () =>
      announcer.subscribe((alerts) =>
        setAlerted((known) => new Set([...known, ...alerts.map((a) => a.printingCode)])),
      ),
    [announcer],
  );

  const clear = useCallback(() => setAlerted(new Set()), []);
  return { count: alerted.size, clear };
}
