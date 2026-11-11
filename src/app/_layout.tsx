import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppCatalogGate } from '@/features/startup/AppCatalogGate';
import { AppDatabaseProvider } from '@/features/startup/AppDatabaseProvider';
import { navigationTheme } from '@/ui/navigationTheme';

export default function RootLayout() {
  return (
    <ThemeProvider value={navigationTheme}>
      <AppDatabaseProvider>
        <StatusBar style="light" />
        <AppCatalogGate>
          <Stack screenOptions={{ headerShown: false }} />
        </AppCatalogGate>
      </AppDatabaseProvider>
    </ThemeProvider>
  );
}
