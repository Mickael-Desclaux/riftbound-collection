import { useState } from 'react';
import { Alert } from 'react-native';

import type { BinderPage } from '@/domain/binder';
import type { CatalogEntry } from '@/domain/catalogEntry';
import type { PrintingCode } from '@/domain/printingCode';
import { useSync } from '@/ui/SyncContext';

import { readImageDataUri } from './binderFiles';
import type { BinderExportStatus } from './BinderView';

/** Demande s'il faut exporter malgré les images indisponibles. */
function confirmMissingImages(count: number): Promise<boolean> {
  const images = count > 1 ? `${count} images sont indisponibles` : '1 image est indisponible';
  return new Promise((resolve) =>
    Alert.alert(
      'Images indisponibles',
      `${images} : un cadre les remplacera dans le PDF. Réessaie plus tard avec une connexion pour les avoir.`,
      [
        { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Exporter quand même', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );
}

/**
 * L'export du classeur (spec § 2.5) : télécharge les grandes images manquantes
 * avec la progression, prévient si certaines sont indisponibles, puis laisse
 * `print` créer et partager le PDF à partir des images (en `data:`).
 */
export function useBinderExport(
  pages: readonly BinderPage[],
  print: (images: ReadonlyMap<PrintingCode, string>) => Promise<void>,
): { status: BinderExportStatus; startExport: () => void } {
  const { downloadBinderImages } = useSync();
  const [status, setStatus] = useState<BinderExportStatus>({ step: 'idle' });

  async function run(): Promise<void> {
    const printings: CatalogEntry[] = pages.flatMap((page) => page.printings);
    const urls = printings.flatMap((printing) =>
      printing.imageLarge ? [printing.imageLarge] : [],
    );
    setStatus({ step: 'images', done: 0, total: urls.length });
    const failed = await downloadBinderImages(urls, (done, total) =>
      setStatus({ step: 'images', done, total }),
    );
    const images = new Map<PrintingCode, string>();
    for (const { printingCode, imageLarge } of printings) {
      if (!imageLarge || failed.has(imageLarge)) continue;
      const uri = await readImageDataUri(imageLarge);
      if (uri) images.set(printingCode, uri);
    }
    const missing = printings.length - images.size;
    if (missing > 0 && !(await confirmMissingImages(missing))) return;
    setStatus({ step: 'pdf' });
    await print(images);
  }

  const startExport = () => {
    if (status.step !== 'idle') return;
    run()
      .catch((error: unknown) =>
        Alert.alert(
          'L’export du classeur a échoué',
          error instanceof Error ? error.message : String(error),
        ),
      )
      .finally(() => setStatus({ step: 'idle' }));
  };

  return { status, startExport };
}
