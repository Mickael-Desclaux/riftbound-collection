import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ApplyThemeSetting } from '@/features/settings/ApplyThemeSetting';
// Définit la tâche en arrière-plan dès le chargement de l'app, comme l'exige expo-task-manager.
import '@/features/startup/backgroundSync';
import { AppCatalogGate } from '@/features/startup/AppCatalogGate';
import { AppDatabaseProvider } from '@/features/startup/AppDatabaseProvider';
import { useNavigationTheme } from '@/ui/navigationTheme';

export default function RootLayout() {
  return (
    <ThemeProvider value={useNavigationTheme()}>
      <StatusBar style="auto" />
      <AppDatabaseProvider>
        <ApplyThemeSetting />
        <AppCatalogGate>
          <Stack screenOptions={{ headerShown: false }} />
        </AppCatalogGate>
      </AppDatabaseProvider>
    </ThemeProvider>
  );
}
