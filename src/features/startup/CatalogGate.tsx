import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { SourceError } from '@/sources/http';
import { colors } from '@/ui/theme';

export type CatalogGateProps = {
  /** Le Catalogue est-il déjà enregistré sur l'appareil ? */
  hasCatalog: boolean;
  /** Lance le premier téléchargement du Catalogue. */
  runFirstSync: (onProgress: (received: number, total: number) => void) => Promise<unknown>;
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
          <Text style={styles.text}>
            {state.total === null
              ? 'Connexion à RiftHunt…'
              : `${formatCount(state.received)} / ${formatCount(state.total)} versions`}
          </Text>
        </Screen>
      );
    case 'offline':
      return (
        <Screen title="Connexion nécessaire">
          <Text style={styles.text}>
            Le catalogue doit être téléchargé une première fois (environ 6 Mo). Le téléchargement
            reprendra tout seul dès que le réseau sera revenu.
          </Text>
          <Button label="Réessayer" onPress={start} />
        </Screen>
      );
    case 'failed':
      return (
        <Screen title="Le catalogue n’a pas pu être téléchargé">
          <Text style={styles.text}>{state.message}</Text>
          <Button label="Réessayer" onPress={start} />
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

function Screen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

function Button({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.button}>
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

function Details({ text }: { text: string | undefined }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return (
    <View style={styles.details}>
      <Pressable accessibilityRole="button" onPress={() => setOpen(!open)}>
        <Text style={styles.link}>Détails</Text>
      </Pressable>
      {open && (
        <Text selectable style={styles.detailsText}>
          {text}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
    backgroundColor: colors.background,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  text: { color: colors.muted, fontSize: 15, textAlign: 'center' },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  buttonLabel: { color: colors.background, fontSize: 16, fontWeight: '600' },
  details: { alignItems: 'center', gap: 8, alignSelf: 'stretch' },
  link: { color: colors.muted, fontSize: 14, textDecorationLine: 'underline' },
  detailsText: { color: colors.muted, fontSize: 12, fontFamily: 'monospace' },
});
