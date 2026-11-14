import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator } from 'react-native';

import { SourceError, type OnProgress } from '@/sync/catalog';
import { Button } from '@/ui/controls';
import { Details } from '@/ui/Details';
import { MessageScreen as Screen, MessageText } from '@/ui/MessageScreen';
import { colors } from '@/ui/theme';

export type CatalogGateProps = {
  /** Le Catalogue est-il déjà enregistré sur l'appareil ? */
  hasCatalog: boolean;
  /** Lance le premier téléchargement du Catalogue. */
  runFirstSync: (onProgress: OnProgress) => Promise<unknown>;
  /** Prévient quand le réseau revient ; renvoie de quoi se désabonner. */
  subscribeToOnline: (listener: () => void) => () => void;
  children: ReactNode;
};

type State =
  | { step: 'downloading'; received: number; total: number | null }
  | { step: 'offline' }
  | { step: 'failed'; message: string; details: string | undefined }
  | { step: 'ready' };

const formatCount = new Intl.NumberFormat('fr-FR').format;

/**
 * Premier lancement (spec § 6) : seul le Catalogue est bloquant. Sans réseau,
 * l'écran « Connexion nécessaire » propose Réessayer et reprend tout seul au
 * retour du réseau.
 */
export function CatalogGate({
  hasCatalog,
  runFirstSync,
  subscribeToOnline,
  children,
}: CatalogGateProps) {
  const [state, setState] = useState<State>(
    hasCatalog ? { step: 'ready' } : { step: 'downloading', received: 0, total: null },
  );
  const running = useRef(false);

  const start = useCallback(() => {
    if (running.current) return;
    running.current = true;
    setState({ step: 'downloading', received: 0, total: null });
    runFirstSync((received, total) => setState({ step: 'downloading', received, total }))
      .then(() => setState({ step: 'ready' }))
      .catch((error: unknown) => setState(failureState(error)))
      .finally(() => {
        running.current = false;
      });
  }, [runFirstSync]);

  useEffect(() => {
    if (!hasCatalog) start();
  }, [hasCatalog, start]);

  const isOffline = state.step === 'offline';
  useEffect(
    () => (isOffline ? subscribeToOnline(start) : undefined),
    [isOffline, subscribeToOnline, start],
  );

  switch (state.step) {
    case 'ready':
      return children;
    case 'downloading':
      return (
        <Screen title="Téléchargement du catalogue">
          <ActivityIndicator color={colors.accent} />
          <MessageText>
            {state.total === null
              ? 'Connexion à RiftHunt…'
              : `${formatCount(state.received)} / ${formatCount(state.total)} versions`}
          </MessageText>
        </Screen>
      );
    case 'offline':
      return (
        <Screen title="Connexion nécessaire">
          <MessageText>
            Le catalogue doit être téléchargé une première fois (environ 6 Mo). Le téléchargement
            reprendra tout seul dès que le réseau sera revenu.
          </MessageText>
          <Button label="Réessayer" onPress={start} variant="primary" />
        </Screen>
      );
    case 'failed':
      return (
        <Screen title="Le catalogue n’a pas pu être téléchargé">
          <MessageText>{state.message}</MessageText>
          <Button label="Réessayer" onPress={start} variant="primary" />
          <Details text={state.details} />
        </Screen>
      );
  }
}

function failureState(error: unknown): State {
  if (error instanceof SourceError && error.kind === 'network') return { step: 'offline' };
  if (error instanceof SourceError) {
    return { step: 'failed', message: error.message, details: error.details };
  }
  return { step: 'failed', message: 'Une erreur inattendue est survenue.', details: String(error) };
}
