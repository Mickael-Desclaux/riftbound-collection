import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import { BINDER_SELECTION_TABLES, readBinderSelection } from '@/data/binder';
import { selectExpansionChips } from '@/data/catalogGrid';
import { useDatabase } from '@/data/DatabaseProvider';
import { latestPublishedAt } from '@/data/prices';
import { setInBinderSelection } from '@/data/printingDetail';
import { useReactiveQuery } from '@/data/useReactiveQuery';
import { useSetting } from '@/data/useSetting';
import { binderEntries, binderPages } from '@/domain/binder';
import { localIsoDate } from '@/domain/dates';
import { usePrintingEntries } from '@/features/printing-browser/usePrintingEntries';
import { useClock } from '@/ui/ClockContext';
import { useToast } from '@/ui/Toast';

import { shareBinderPdf } from './binderFiles';
import { binderHtml } from './binderHtml';
import { BinderView, type BinderExportOptions } from './BinderView';
import { useBinderExport } from './useBinderExport';

/** Écran Classeur, ouvert depuis l'onglet Collection (spec § 2.5). */
export function BinderScreen() {
  const db = useDatabase();
  const router = useRouter();
  const now = useClock();
  const showToast = useToast();
  const { entries, owned, wishlist } = usePrintingEntries();
  const selection = useReactiveQuery(() => readBinderSelection(db), [db], BINDER_SELECTION_TABLES);
  const pages = useMemo(
    () => binderPages(binderEntries(entries, selection, owned, wishlist)),
    [entries, selection, owned, wishlist],
  );
  const expansionNames = useReactiveQuery(
    () =>
      new Map(
        selectExpansionChips(db, true)
          .all()
          .map((expansion) => [expansion.code, expansion.name]),
      ),
    [db],
    ['expansion'],
  );
  const [displayCurrency] = useSetting('displayCurrency');
  const [priceSource] = useSetting('priceSource');
  const priceDate = useReactiveQuery(
    () => latestPublishedAt(db, priceSource) ?? null,
    [db, priceSource],
    ['current_price'],
  );
  const [options, setOptions] = useState<BinderExportOptions>({
    showPrices: true,
    markOwned: true,
  });
  const { status, startExport } = useBinderExport(pages, (images) =>
    shareBinderPdf(
      binderHtml(pages, { ...options, expansionNames, displayCurrency, priceDate, images }),
      `classeur-riftbound-${localIsoDate(now())}.pdf`,
    ),
  );

  return (
    <BinderView
      pages={pages}
      expansionNames={expansionNames}
      options={options}
      onOptionsChange={setOptions}
      status={status}
      onExport={startExport}
      onRemove={({ printingCode }) => {
        setInBinderSelection(db, printingCode, false);
        showToast({
          message: 'Retirée du classeur',
          actionLabel: 'Annuler',
          onAction: () => setInBinderSelection(db, printingCode, true),
        });
      }}
      onBack={() => router.back()}
    />
  );
}
