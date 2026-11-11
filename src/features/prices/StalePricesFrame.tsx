import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/ui/theme';

import { StalePricesBanner } from './StalePricesBanner';

/**
 * Place le bandeau des prix de plus de 48 h au-dessus de `children`. Le bandeau
 * prend la marge du haut ; le second SafeAreaProvider calcule les marges à sa
 * propre position, donc les écrans dessous n'en ont plus.
 */
export function StalePricesFrame({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <View style={styles.frame}>
      <StalePricesBanner />
      <SafeAreaProvider style={styles.content}>{children}</SafeAreaProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
});
