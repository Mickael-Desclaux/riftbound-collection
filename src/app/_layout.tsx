import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppDatabaseProvider } from '@/data/AppDatabaseProvider';

export default function RootLayout() {
  return (
    <AppDatabaseProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </AppDatabaseProvider>
  );
}
