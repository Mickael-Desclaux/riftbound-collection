/**
 * « Tout resynchroniser », « Reconstruire le catalogue » et « État des
 * sources » (spec § 2.6) : la dernière réussite et la dernière erreur de chaque
 * source, pour comprendre ce qui ne va pas.
 */
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import type { SourceId } from '@/data/schema';
import type { SourceState } from '@/data/sourceState';
import { sourceHealth, type SourceHealth } from '@/domain/sourceStatus';
import type { ResyncMode, SyncReport } from '@/sync/syncAll';
import { Button } from '@/ui/controls';
import { Details } from '@/ui/Details';
import { formatDateTime } from '@/ui/format';
import { colors } from '@/ui/theme';

import { SOURCE_LABELS, SYNC_STEP_LABELS } from './sourceLabels';

type Props = {
  /** L'état des sources déjà contactées (`source_state`). */
  states: readonly SourceState[];
  resynchronize: (mode: ResyncMode) => Promise<SyncReport>;
};

type Status =
  { tone: 'running' } | { tone: 'success' | 'error'; message: string; details?: string };

const HEALTH_LABELS: Record<SourceHealth, string> = {
  ok: 'À jour',
  failing: 'En échec',
  never: 'Jamais contactée',
};

export function SourceSettings({ states, resynchronize }: Readonly<Props>) {
  const [status, setStatus] = useState<Status | null>(null);
  const busy = useRef(false);

  async function run(mode: ResyncMode) {
    if (busy.current) return;
    busy.current = true;
    setStatus({ tone: 'running' });
    try {
      setStatus(reportStatus(await resynchronize(mode)));
    } catch (error) {
      setStatus({
        tone: 'error',
        message: 'La synchronisation n’a pas pu être lancée. Réessaie.',
        details: String(error),
      });
    } finally {
      busy.current = false;
    }
  }

  const rebuild = () =>
    Alert.alert(
      'Reconstruire le catalogue ?',
      'Le catalogue sera effacé puis retéléchargé (environ 6 Mo), ainsi que les prix. Ta Collection, tes souhaits, ton classeur, tes réglages et l’historique des prix ne changent pas.',
      [
        { text: 'Retour', style: 'cancel' },
        { text: 'Reconstruire', style: 'destructive', onPress: () => void run('rebuild') },
      ],
      { cancelable: true },
    );

  const byId = new Map(states.map((state) => [state.source, state]));
  return (
    <View style={styles.container}>
      <Button label="Tout resynchroniser" onPress={() => void run('resync')} />
      <Button label="Reconstruire le catalogue" onPress={rebuild} />
      {status && <StatusMessage status={status} />}

      <Text style={styles.title}>État des sources</Text>
      {states.some((state) => sourceHealth(state) === 'failing') && (
        <Text style={styles.muted}>
          Une source en échec est réessayée à chaque retour dans l’app ; « Tout resynchroniser » la
          relance tout de suite.
        </Text>
      )}
      {(Object.keys(SOURCE_LABELS) as SourceId[]).map((source) => (
        <SourceRow key={source} source={source} state={byId.get(source)} />
      ))}
    </View>
  );
}

function StatusMessage({ status }: { status: Status }) {
  if (status.tone === 'running') {
    return (
      <View accessibilityLiveRegion="polite" style={styles.running}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.text}>Synchronisation en cours…</Text>
      </View>
    );
  }
  return (
    <View accessibilityLiveRegion="polite" style={styles.status}>
      <Text style={status.tone === 'error' ? styles.error : styles.text}>{status.message}</Text>
      <Details text={status.details} align="flex-start" />
    </View>
  );
}

function reportStatus({ failures }: SyncReport): Status {
  if (failures.length === 0) return { tone: 'success', message: 'Tout est à jour.' };
  const names = failures.map((f) => SYNC_STEP_LABELS[f.step]).join(', ');
  return {
    tone: 'error',
    message: `Pas de mise à jour pour ${names} : le dernier état connu est gardé. Réessaie plus tard ; l’état de chaque source est ci-dessous.`,
    details: failures
      .map((f) => `${f.step} : ${f.error instanceof Error ? f.error.message : String(f.error)}`)
      .join('\n'),
  };
}

function SourceRow({ source, state }: { source: SourceId; state: SourceState | undefined }) {
  const health = sourceHealth(state);
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.label}>{SOURCE_LABELS[source]}</Text>
        <Text style={health === 'failing' ? styles.error : styles.muted}>
          {HEALTH_LABELS[health]}
        </Text>
      </View>
      <Text style={styles.muted}>
        Dernière réussite : {state?.lastSuccessAt ? formatDateTime(state.lastSuccessAt) : 'aucune'}
      </Text>
      {state?.lastErrorAt && (
        <>
          <Text style={styles.muted}>
            Dernière erreur : {formatDateTime(state.lastErrorAt)}
            {state.lastErrorMessage ? ` · ${state.lastErrorMessage}` : ''}
          </Text>
          <Details text={state.lastErrorDetails ?? undefined} align="flex-start" />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10, marginTop: 10 },
  title: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 16 },
  running: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  status: { gap: 6 },
  row: { gap: 2, paddingVertical: 6 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  label: { color: colors.text, fontSize: 14, fontWeight: '600', flexShrink: 1 },
  text: { color: colors.text, fontSize: 14 },
  muted: { color: colors.muted, fontSize: 13 },
  error: { color: colors.accent, fontSize: 13 },
});
