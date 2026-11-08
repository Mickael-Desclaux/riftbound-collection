import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppCatalogGate } from '@/features/startup/AppCatalogGate';
import { AppDatabaseProvider } from '@/features/startup/AppDatabaseProvider';

export default function RootLayout() {
  return (
    <AppDatabaseProvider>
      <StatusBar style="light" />
      <AppCatalogGate>
        <Stack screenOptions={{ headerShown: false }} />
      </AppCatalogGate>
    </AppDatabaseProvider>
  );
}
