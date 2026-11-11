import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { View, type ColorValue } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StalePricesBanner } from '@/features/prices/StalePricesBanner';
import { colors } from '@/ui/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

type TabIconProps = { color: ColorValue; size: number };

function tabIcon(name: IconName) {
  return function TabIcon({ color, size }: TabIconProps) {
    // Nos teintes d'onglet sont des chaînes ; Ionicons n'accepte pas les autres formes de ColorValue.
    return (
      <Ionicons name={name} color={typeof color === 'string' ? color : undefined} size={size} />
    );
  };
}

export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Bandeau global : il prend la marge du haut. Le second SafeAreaProvider
          calcule les marges à sa propre position : sous le bandeau, plus de marge du haut. */}
      <StalePricesBanner />
      <SafeAreaProvider style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.accent,
            tabBarInactiveTintColor: colors.muted,
            tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
          }}
        >
          <Tabs.Screen
            name="catalog"
            options={{ title: 'Catalogue', tabBarIcon: tabIcon('albums') }}
          />
          <Tabs.Screen
            name="collection"
            options={{ title: 'Collection', tabBarIcon: tabIcon('checkmark-circle') }}
          />
          <Tabs.Screen
            name="wishlist"
            options={{ title: 'Souhaits', tabBarIcon: tabIcon('heart') }}
          />
          <Tabs.Screen
            name="settings"
            options={{ title: 'Réglages', tabBarIcon: tabIcon('settings') }}
          />
        </Tabs>
      </SafeAreaProvider>
    </View>
  );
}
