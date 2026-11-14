import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { CatalogRequestProvider } from '@/features/catalog/catalogRequest';
import { NewExpansionsFrame } from '@/features/notifications/NewExpansionsFrame';
import { NotificationResponses } from '@/features/notifications/NotificationResponses';
import { usePriceAlertBadge } from '@/features/notifications/usePriceAlertBadge';
import { StalePricesFrame } from '@/features/prices/StalePricesFrame';
import { colors } from '@/ui/theme';
import { ToastProvider } from '@/ui/Toast';

/** Hauteur de la barre d'onglets (hors zone sûre), que le toast laisse libre. */
const TAB_BAR_HEIGHT = 56;

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
  const priceAlertBadge = usePriceAlertBadge();
  return (
    <StalePricesFrame>
      <ToastProvider bottomOffset={TAB_BAR_HEIGHT}>
        <Tabs
          // La mise en page reçoit le navigateur des onglets : le bandeau et
          // les notifications touchées peuvent ainsi ouvrir le Catalogue ou les Souhaits.
          layout={({ children, navigation }) => (
            <CatalogRequestProvider showCatalogTab={() => navigation.navigate('catalog')}>
              <NotificationResponses showWishlistTab={() => navigation.navigate('wishlist')} />
              <NewExpansionsFrame>{children}</NewExpansionsFrame>
            </CatalogRequestProvider>
          )}
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
            // La pastille des Alertes de prix s'efface dès qu'on a vu l'onglet.
            options={({ navigation }) => ({
              title: 'Souhaits',
              tabBarIcon: tabIcon('heart'),
              tabBarBadge:
                priceAlertBadge.count > 0 && !navigation.isFocused()
                  ? priceAlertBadge.count
                  : undefined,
              tabBarBadgeStyle: { backgroundColor: colors.accent, color: colors.background },
            })}
            listeners={{ focus: priceAlertBadge.clear, blur: priceAlertBadge.clear }}
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
