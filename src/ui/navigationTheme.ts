import { DarkTheme, DefaultTheme } from 'expo-router';
import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { usePalette } from './theme';

/**
 * Thème de la navigation, aux couleurs du thème actif : sans lui, les piles
 * peignent le fond de React Navigation pendant leurs fondus, d'où des flashs.
 */
export function useNavigationTheme() {
  const dark = useColorScheme() !== 'light';
  const colors = usePalette();
  return useMemo(() => {
    const base = dark ? DarkTheme : DefaultTheme;
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
  }, [dark, colors]);
}
