import { Stack, Tabs, router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Pressable, Text } from 'react-native';

import { DEFAULT_CATALOG_FILTERS } from '@/domain/catalogFilters';

import { CatalogRequestProvider, useCatalogRequest, useOpenCatalog } from './catalogRequest';

const MISSING_OGN = {
  ...DEFAULT_CATALOG_FILTERS,
  expansionCodes: ['OGN'],
  ownership: 'missing' as const,
};

function CatalogGrid() {
  const request = useCatalogRequest();
  return <Text>grille {request ? request.expansionCodes.join() : 'sans demande'}</Text>;
}

function CollectionGrid() {
  const openCatalog = useOpenCatalog();
  return (
    <Pressable accessibilityRole="button" onPress={() => openCatalog(MISSING_OGN)}>
      <Text>ORIGINS</Text>
    </Pressable>
  );
}

const stack = () => <Stack />;

/** La forme des onglets de l'app : une pile par onglet, la demande partagée autour. */
async function setup() {
  await renderRouter(
    {
      _layout: stack,
      '(tabs)/_layout': () => (
        <CatalogRequestProvider>
          <Tabs>
            <Tabs.Screen name="catalog" />
            <Tabs.Screen name="collection" />
          </Tabs>
        </CatalogRequestProvider>
      ),
      '(tabs)/catalog/_layout': stack,
      '(tabs)/catalog/index': CatalogGrid,
      '(tabs)/catalog/[printingCode]': () => <Text>fiche</Text>,
      '(tabs)/collection/_layout': stack,
      '(tabs)/collection/index': CollectionGrid,
    },
    { initialUrl: '/catalog' },
  );
}

describe('useOpenCatalog', () => {
  it('ouvre la grille du Catalogue filtrée, en refermant la fiche restée ouverte', async () => {
    await setup();
    await act(async () => router.push('/catalog/OGN-001'));
    await act(async () => router.navigate('/collection'));

    await fireEvent.press(screen.getByRole('button', { name: 'ORIGINS' }));

    expect(screen).toHavePathname('/catalog');
    expect(screen.getByText('grille OGN')).toBeTruthy();
    expect(screen.queryByText('fiche')).toBeNull();
  });
});
