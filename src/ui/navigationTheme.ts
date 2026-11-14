import { DarkTheme, DefaultTheme } from 'expo-router';
import { useMemo } from 'react';

import { darkPalette, usePalette } from './theme';

/**
 * Thème de la navigation, aux couleurs du thème actif : sans lui, les piles
 * peignent le fond de React Navigation pendant leurs fondus, d'où des flashs.
 */
export function useNavigationTheme() {
  const colors = usePalette();
  return useMemo(() => {
    const base = colors === darkPalette ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.accent,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.line,
      },
    };
  }, [colors]);
}
