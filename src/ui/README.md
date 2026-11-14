# `src/ui/`

Composants partagés, thème et formatage d'affichage.

## Thème

Les couleurs sont des jetons (`Palette`) dans `theme.ts`, une palette Claire et une Sombre (celle des prototypes). Un composant déclare sa feuille de styles comme une fabrique au niveau du module et la lit avec `useThemedStyles` :

```tsx
const makeStyles = (colors: Palette) => StyleSheet.create({ screen: { backgroundColor: colors.background } });

function Screen() {
  const styles = useThemedStyles(makeStyles);
  …
}
```

Le réglage Thème est appliqué par `features/settings/ApplyThemeSetting` via `Appearance.setColorScheme` : `useColorScheme`, la barre d'état et les fenêtres natives (calendrier) suivent ainsi le thème choisi.
