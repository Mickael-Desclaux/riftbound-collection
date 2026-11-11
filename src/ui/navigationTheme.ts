import { DarkTheme } from 'expo-router';

import { colors } from './theme';

/**
 * Thème de la navigation : sans lui, les piles peignent un fond blanc (thème
 * clair de React Navigation) pendant leurs fondus, d'où des flashs blancs.
 */
export const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.line,
  },
};
