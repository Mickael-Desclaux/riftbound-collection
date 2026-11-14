import { fireEvent, render, screen } from '@testing-library/react-native';

import { NewExpansionsNotice } from './NewExpansionsNotice';

const VENDETTA = { code: 'VEN', name: 'Vendetta', isPromo: false };

async function setup(expansions = [VENDETTA]) {
  const onOpen = jest.fn();
  const onDismiss = jest.fn();
  await render(
    <NewExpansionsNotice expansions={expansions} onOpen={onOpen} onDismiss={onDismiss} />,
  );
  return { onOpen, onDismiss };
}

describe('NewExpansionsNotice', () => {
  it('annonce la nouvelle Extension et ouvre le Catalogue', async () => {
    const { onOpen } = await setup();

    expect(screen.getByText('Vendetta est arrivée dans le catalogue.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Voir' }));

    expect(onOpen).toHaveBeenCalled();
  });

  it('se ferme', async () => {
    const { onDismiss } = await setup();

    await fireEvent.press(screen.getByRole('button', { name: 'Fermer' }));

    expect(onDismiss).toHaveBeenCalled();
  });

  it('n’affiche rien sans nouvelle Extension', async () => {
    await setup([]);

    expect(screen.queryByRole('button', { name: 'Voir' })).toBeNull();
  });
});
