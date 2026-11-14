import { useEffect } from 'react';
import { Appearance } from 'react-native';

import { useSetting } from '@/data/useSetting';
import type { Theme } from '@/domain/settings';

const COLOR_SCHEMES = {
  system: 'unspecified',
  light: 'light',
  dark: 'dark',
} as const satisfies Record<Theme, Parameters<typeof Appearance.setColorScheme>[0]>;

/**
 * Applique le réglage Thème à toute l'app, fenêtres natives comprises.
 * Avant l'ouverture de la base (et si les migrations échouent), l'app suit le téléphone.
 */
export function ApplyThemeSetting() {
  const [theme] = useSetting('theme');
  useEffect(() => {
    Appearance.setColorScheme(COLOR_SCHEMES[theme]);
  }, [theme]);
  return null;
}
