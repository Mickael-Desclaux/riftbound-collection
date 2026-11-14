/** Repli « Détails » des messages d'erreur (spec § 6) : le diagnostic, affiché à la demande. */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type Palette, useThemedStyles } from './theme';

export function Details({
  text,
  align = 'center',
}: {
  text: string | undefined;
  align?: 'center' | 'flex-start';
}) {
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return (
    <View style={[styles.details, { alignItems: align }]}>
      <Pressable accessibilityRole="button" onPress={() => setOpen(!open)}>
        <Text style={styles.link}>Détails</Text>
      </Pressable>
      {open && (
        <Text selectable style={styles.text}>
          {text}
        </Text>
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    details: { gap: 8, alignSelf: 'stretch' },
    link: { color: colors.muted, fontSize: 14, textDecorationLine: 'underline' },
    text: { color: colors.muted, fontSize: 12, fontFamily: 'monospace' },
  });
