import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { SourceError } from '@/sources/http';

import { CatalogGate, type CatalogGateProps } from './CatalogGate';

/** Un premier téléchargement piloté par le test. */
function controlledSync() {
  const attempts: {
    onProgress: (received: number, total: number) => void;
    resolve: () => void;
    reject: (error: unknown) => void;
  }[] = [];
  const runFirstSync: CatalogGateProps['runFirstSync'] = (onProgress) =>
    new Promise<void>((resolve, reject) => attempts.push({ onProgress, resolve, reject }));
  return { runFirstSync, attempts };
}

async function setup(props: Partial<CatalogGateProps> = {}) {
  const sync = controlledSync();
  let goOnline = () => {};
  const subscribeToOnline: CatalogGateProps['subscribeToOnline'] = (listener) => {
    goOnline = listener;
    return () => {};
  };
  await render(
    <CatalogGate
      hasCatalog={false}
      runFirstSync={sync.runFirstSync}
      subscribeToOnline={subscribeToOnline}
      {...props}
    >
      <Text>Onglets</Text>
    </CatalogGate>,
  );
  return { ...sync, goOnline: () => act(goOnline) };
}

const offline = new SourceError('network', 'Impossible de joindre api.rifthunt.com.');

describe('CatalogGate', () => {
  it('affiche directement l’app quand le Catalogue est déjà là', async () => {
    const { attempts } = await setup({ hasCatalog: true });

    expect(await screen.findByText('Onglets')).toBeTruthy();
    expect(attempts).toHaveLength(0);
  });

  it('montre la progression du premier téléchargement, puis l’app', async () => {
    const { attempts } = await setup();

    await act(async () => attempts[0]?.onProgress(700, 1725));
    expect(screen.getByText('700 / 1\u202f725 versions')).toBeTruthy();

    await act(async () => attempts[0]?.resolve());
    expect(screen.getByText('Onglets')).toBeTruthy();
  });

  it('demande une connexion et réessaie au toucher', async () => {
    const { attempts } = await setup();
    await act(async () => attempts[0]?.reject(offline));

    expect(screen.getByText('Connexion nécessaire')).toBeTruthy();
    await fireEvent.press(screen.getByText('Réessayer'));

    expect(attempts).toHaveLength(2);
  });

  it('reprend tout seul au retour du réseau', async () => {
    const { attempts, goOnline } = await setup();
    await act(async () => attempts[0]?.reject(offline));

    await goOnline();

    expect(attempts).toHaveLength(2);
  });

  it('explique une autre erreur, avec ses détails sur demande', async () => {
    const { attempts } = await setup();
    await act(async () =>
      attempts[0]?.reject(
        new SourceError('format', 'Format inattendu dans le catalogue RiftHunt.', 'variant'),
      ),
    );

    expect(screen.getByText('Le catalogue n’a pas pu être téléchargé')).toBeTruthy();
    expect(screen.queryByText(/variant/)).toBeNull();
    await fireEvent.press(screen.getByText('Détails'));
    expect(screen.getByText(/variant/)).toBeTruthy();
  });
});
