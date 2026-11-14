/**
 * Jetons de couleur des thèmes Clair et Sombre (spec § 2.6).
 *
 * Le thème actif est celui du téléphone, ou celui choisi dans les Réglages :
 * `ThemeSetting` le force pour toute l'app via `Appearance.setColorScheme`,
 * si bien que `useColorScheme` (et les fenêtres natives, comme le calendrier)
 * suivent toujours le bon thème.
 */
import { useColorScheme } from 'react-native';

export type Palette = {
  /** Fond des écrans. */
  background: string;
  /** Fond des cartes, contrôles et barres. */
  surface: string;
  text: string;
  /** Texte secondaire. */
  muted: string;
  /** Couleur d'accent : sélection, liens, onglet actif. */
  accent: string;
  /** Texte posé sur un fond `accent`. */
  onAccent: string;
  /** Bordures et séparateurs. */
  line: string;
};

/** Sombre : les couleurs des prototypes. */
export const darkPalette: Palette = {
  background: '#0d1017',
  surface: '#161b26',
  text: '#e9ecf3',
  muted: '#8b93a7',
  accent: '#e0b44c',
  onAccent: '#0d1017',
  line: '#2a3142',
};

/** Clair : les teintes de l'app d'origine, avec un doré assez foncé pour se lire sur blanc. */
export const lightPalette: Palette = {
  background: '#f2f4f7',
  surface: '#ffffff',
  text: '#1c2940',
  muted: '#526178',
  accent: '#8a6100',
  onAccent: '#ffffff',
  line: '#d4dbe5',
};

/** Couleurs du thème actif. */
export function usePalette(): Palette {
  return useColorScheme() === 'light' ? lightPalette : darkPalette;
}

type StylesFactory<T> = (palette: Palette) => T;

const stylesCache = new WeakMap<StylesFactory<unknown>, Map<Palette, unknown>>();

/**
 * Feuille de styles d'un composant pour le thème actif. La fabrique est
 * appelée une seule fois par thème : la déclarer au niveau du module.
 */
export function useThemedStyles<T>(factory: StylesFactory<T>): T {
  const palette = usePalette();
  let byPalette = stylesCache.get(factory);
  if (byPalette === undefined) {
    byPalette = new Map();
    stylesCache.set(factory, byPalette);
  }
  let styles = byPalette.get(palette) as T | undefined;
  if (styles === undefined) {
    styles = factory(palette);
    byPalette.set(palette, styles);
  }
  return styles;
}
