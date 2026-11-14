/** Boutons et puces partagés par les écrans. */
import { Pressable, StyleSheet, Text } from 'react-native';

import { type Palette, useThemedStyles } from './theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  /** `primary` : action principale de l'écran (fond doré). */
  variant?: 'primary' | 'secondary';
};

export function Button({ label, onPress, variant = 'secondary' }: ButtonProps) {
  const styles = useThemedStyles(makeStyles);
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.button, primary && styles.selected]}
    >
      <Text style={[styles.label, primary && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text style={[styles.chipLabel, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}

/** Styles communs des contrôles, à étaler dans la feuille de styles d'un composant. */
export function controlStyles(colors: Palette) {
  return {
    /** Fond et bordure d'un contrôle au repos. */
    idle: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
    selected: { backgroundColor: colors.accent, borderColor: colors.accent },
    selectedLabel: { color: colors.onAccent, fontWeight: '600' },
  } as const;
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    button: {
      ...controlStyles(colors).idle,
      borderRadius: 8,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    chip: {
      ...controlStyles(colors).idle,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    label: { color: colors.text, fontSize: 15 },
    chipLabel: { color: colors.text, fontSize: 13 },
    selected: controlStyles(colors).selected,
    selectedLabel: controlStyles(colors).selectedLabel,
  });
