import { Stack } from 'expo-router';

import { printingDetailScreenOptions } from '@/ui/zoom/PrintingZoom';

export default function CollectionLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[printingCode]" options={printingDetailScreenOptions} />
    </Stack>
  );
}
