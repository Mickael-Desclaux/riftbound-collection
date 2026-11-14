import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { expansionFilters } from '@/domain/catalogFilters';
import { useOpenCatalog } from '@/features/catalog/catalogRequest';
import type { NewExpansion } from '@/domain/catalog';

import { newExpansionAnnouncer } from './newExpansionAnnouncer';
import { NewExpansionsNotice } from './NewExpansionsNotice';

/** Ajoute les Extensions annoncées à celles déjà affichées, sans doublon. */
function merged(shown: NewExpansion[], announced: NewExpansion[]): NewExpansion[] {
  const codes = new Set(shown.map((e) => e.code));
  return [...shown, ...announced.filter((e) => !codes.has(e.code))];
}

/**
 * Place le message des nouvelles Extensions au-dessus de `children`. Comme
 * pour le bandeau des prix, le second SafeAreaProvider recalcule les marges
 * des écrans dessous. « Voir » ouvre le Catalogue filtré sur ces Extensions.
 */
export function NewExpansionsFrame({ children }: Readonly<{ children: ReactNode }>) {
  const [expansions, setExpansions] = useState<NewExpansion[]>([]);
  const openCatalog = useOpenCatalog();

  useEffect(
    () =>
      newExpansionAnnouncer.subscribe((announced) =>
        setExpansions((shown) => merged(shown, announced)),
      ),
    [],
  );

  return (
    <View style={styles.frame}>
      <NewExpansionsNotice
        expansions={expansions}
        onOpen={() => {
          openCatalog(expansionFilters(expansions));
          setExpansions([]);
        }}
        onDismiss={() => setExpansions([])}
      />
      <SafeAreaProvider style={styles.content}>{children}</SafeAreaProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
  content: { flex: 1 },
});
