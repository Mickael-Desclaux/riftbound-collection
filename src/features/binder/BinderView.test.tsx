import { fireEvent, render, screen } from '@testing-library/react-native';

import { binderPages } from '@/domain/binder';
import { entry } from '@/domain/testing/catalogEntries';

import { BinderView, type BinderExportStatus } from './BinderView';

const pages = binderPages(
  Array.from({ length: 10 }, (_, i) =>
    entry(`OGN-${String(i + 1).padStart(3, '0')}`, { name: `Carte ${i + 1}` }),
  ),
);

async function setup(status: BinderExportStatus = { step: 'idle' }, shown = pages) {
  const handlers = { onExport: jest.fn(), onRemove: jest.fn(), onOptionsChange: jest.fn() };
  await render(
    <BinderView
      pages={shown}
      expansionNames={new Map([['OGN', 'Origins']])}
      options={{ showPrices: true, markOwned: true }}
      status={status}
      onBack={jest.fn()}
      {...handlers}
    />,
  );
  return handlers;
}

describe('BinderView', () => {
  it('résume le classeur et le montre page par page', async () => {
    await setup();

    expect(screen.getByText('10 cartes · 2 pages A4')).toBeTruthy();
    expect(screen.getByText('Origins · page 2/2')).toBeTruthy();
  });

  it('retire une carte touchée, et règle les options', async () => {
    const { onRemove, onOptionsChange } = await setup();

    await fireEvent.press(screen.getByLabelText('Retirer Carte 3 (OGN-003) du classeur'));
    expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ printingCode: 'OGN-003' }));

    await fireEvent(screen.getByLabelText('Afficher les prix'), 'valueChange', false);
    expect(onOptionsChange).toHaveBeenCalledWith({ showPrices: false, markOwned: true });
  });

  it('exporte, puis montre la progression du téléchargement des images', async () => {
    const { onExport } = await setup();
    await fireEvent.press(screen.getByText('Exporter en PDF'));
    expect(onExport).toHaveBeenCalled();

    await setup({ step: 'images', done: 3, total: 10 });
    expect(screen.getByText('Téléchargement des images : 3 / 10')).toBeTruthy();
    expect(screen.queryByText('Exporter en PDF')).toBeNull();
  });

  it('explique comment remplir un classeur vide', async () => {
    await setup({ step: 'idle' }, []);

    expect(screen.getByText('Ton classeur est vide.')).toBeTruthy();
    expect(screen.queryByText('Exporter en PDF')).toBeNull();
  });
});
