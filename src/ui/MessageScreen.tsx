/** Écran plein d'un seul message (premier lancement, erreur bloquante), avec ses actions. */
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from './theme';

export function MessageScreen({
  title,
  children,
}: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

export function MessageText({ children }: Readonly<{ children: ReactNode }>) {
  return <Text style={styles.text}>{children}</Text>;
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
});
