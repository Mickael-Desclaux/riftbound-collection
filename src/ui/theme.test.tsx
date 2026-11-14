import { renderHook } from '@testing-library/react-native';
import { StyleSheet, useColorScheme } from 'react-native';

import { darkPalette, lightPalette, usePalette, useThemedStyles, type Palette } from './theme';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const colorScheme = jest.mocked(useColorScheme);

const makeStyles = jest.fn((colors: Palette) =>
  StyleSheet.create({ screen: { backgroundColor: colors.background } }),
);

describe('thème', () => {
  it('donne les couleurs du thème actif, sombre si le téléphone n’en dit rien', async () => {
    colorScheme.mockReturnValue('light');
    expect((await renderHook(() => usePalette())).result.current).toBe(lightPalette);

    colorScheme.mockReturnValue('dark');
    expect((await renderHook(() => usePalette())).result.current).toBe(darkPalette);

    colorScheme.mockReturnValue(null);
    expect((await renderHook(() => usePalette())).result.current).toBe(darkPalette);
  });

  it('ne fabrique la feuille de styles qu’une fois par thème', async () => {
    colorScheme.mockReturnValue('dark');
    const first = await renderHook(() => useThemedStyles(makeStyles));
    const second = await renderHook(() => useThemedStyles(makeStyles));
    colorScheme.mockReturnValue('light');
    const light = await renderHook(() => useThemedStyles(makeStyles));

    expect(first.result.current.screen.backgroundColor).toBe(darkPalette.background);
    expect(second.result.current).toBe(first.result.current);
    expect(light.result.current.screen.backgroundColor).toBe(lightPalette.background);
    expect(makeStyles).toHaveBeenCalledTimes(2);
  });
});
