import { StyleSheet, Text, View } from 'react-native';

import { THEMES, type Theme } from '@/domain/settings';
import { Chip } from '@/ui/controls';
import { THEME_LABELS } from '@/ui/labels';
import { type Palette, useThemedStyles } from '@/ui/theme';

type Props = {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
};

/** Réglage Thème (spec § 2.6) : celui du téléphone, Clair ou Sombre. */
export function ThemeSettings({ theme, onThemeChange }: Readonly<Props>) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Thème</Text>
      <View style={styles.row}>
        {THEMES.map((option) => (
          <Chip
            key={option}
            label={THEME_LABELS[option]}
            selected={option === theme}
            onPress={() => onThemeChange(option)}
          />
        ))}
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { gap: 10 },
    title: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 8 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  });
