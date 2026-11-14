import { useCallback, useEffect, useState } from 'react';

import type { PrintingCode } from '@/domain/printingCode';

import { priceAlertAnnouncer } from './announcer';

/**
 * La pastille de l'onglet Souhaits (spec § 3 point 10) : le nombre de
 * Versions qui ont donné une Alerte de prix pendant que l'app était ouverte,
 * jusqu'à ce qu'on ouvre l'onglet (`clear`).
 */
export function usePriceAlertBadge(): { count: number; clear: () => void } {
  const [alerted, setAlerted] = useState<ReadonlySet<PrintingCode>>(new Set());

  useEffect(
    () =>
      priceAlertAnnouncer.subscribe((alerts) =>
        setAlerted((known) => new Set([...known, ...alerts.map((a) => a.printingCode)])),
      ),
    [],
  );

  const clear = useCallback(() => setAlerted(new Set()), []);
  return { count: alerted.size, clear };
}
