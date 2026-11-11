import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useDatabase } from '@/data/DatabaseProvider';
import { latestPublishedAt } from '@/data/prices';
import { useReactiveQuery } from '@/data/useReactiveQuery';
import { useSetting } from '@/data/useSetting';
import { useClock } from '@/ui/ClockContext';
import { useSync } from '@/ui/SyncContext';

import { StalePricesNotice } from './StalePricesNotice';

/** Bandeau global des prix de plus de 48 h, pour la Source de prix choisie. */
export function StalePricesBanner() {
  const db = useDatabase();
  const now = useClock();
  const { refresh } = useSync();
  const [priceSource] = useSetting('priceSource');
  const published = useReactiveQuery(
    () => latestPublishedAt(db, priceSource),
    [db, priceSource],
    ['current_price'],
  );
  // Les prix vieillissent même sans changement en base : on relit l'heure au retour dans l'app.
  const [, setResumeCount] = useState(0);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setResumeCount((n) => n + 1);
    });
    return () => subscription.remove();
  }, []);

  return (
    <StalePricesNotice latestPublishedAt={published} now={now()} onRefresh={() => void refresh()} />
  );
}
