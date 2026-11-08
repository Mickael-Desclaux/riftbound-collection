/** Boutons et puces partagés par les écrans. */
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from './theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  /** `primary` : action principale de l'écran (fond doré). */
  variant?: 'primary' | 'secondary';
};

export function Button({ label, onPress, variant = 'secondary' }: ButtonProps) {
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

export const controlStyles = StyleSheet.create({
  /** Fond et bordure d'un contrôle au repos. */
  idle: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  selected: { backgroundColor: colors.accent, borderColor: colors.accent },
  selectedLabel: { color: colors.background, fontWeight: '600' },
});

const styles = StyleSheet.create({
  button: {
    ...controlStyles.idle,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  chip: {
    ...controlStyles.idle,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  label: { color: colors.text, fontSize: 15 },
  chipLabel: { color: colors.text, fontSize: 13 },
  selected: controlStyles.selected,
  selectedLabel: controlStyles.selectedLabel,
});
