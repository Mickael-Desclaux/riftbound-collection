import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { StalePricesFrame } from '@/features/prices/StalePricesFrame';
import { colors } from '@/ui/theme';
import { ToastProvider } from '@/ui/Toast';

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
    <StalePricesFrame>
      <ToastProvider>
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
      </ToastProvider>
    </StalePricesFrame>
  );
}
