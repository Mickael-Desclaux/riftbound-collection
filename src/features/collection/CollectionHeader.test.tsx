import { fireEvent, render, screen } from '@testing-library/react-native';

import type { PrintingFinishHistory } from '@/domain/priceHistory';
import { entry } from '@/domain/testing/catalogEntries';
import type { PriceLineChartProps } from '@/ui/PriceLineChart';

import { CollectionHeader } from './CollectionHeader';

/** Le dernier graphique dessiné, pour lire ce qu'il a reçu. */
const mockChart: { props?: PriceLineChartProps } = {};
jest.mock('@/ui/PriceLineChart', () => ({
  PriceLineChart: (props: PriceLineChartProps) => {
    mockChart.props = props;
    return null;
  },
}));

const NBSP = ' ';

const owned = [
  entry('OGN-001', { ownedQuantity: 2, price: 1.5 }),
  entry('OGN-002', { ownedQuantity: 1, price: null }),
];
const catalog = [...owned, entry('OGN-003')];
const history: PrintingFinishHistory = new Map([
  ['OGN-001|normal', [{ recordedAt: '2026-10-01T12:00:00.000Z', value: 1 }]],
]);

async function setup() {
  const onOpenCompletion = jest.fn();
  await render(
    <CollectionHeader
      owned={owned}
      catalog={catalog}
      expansionNames={new Map([['OGN', 'Origins']])}
      history={history}
      sourceCurrency="USD"
      displayCurrency="USD"
      rates={[]}
      today="2026-11-14"
      onOpenCompletion={onOpenCompletion}
    />,
  );
  return { onOpenCompletion };
}

describe('CollectionHeader', () => {
  it('donne la Valeur de la collection, ses comptes et sa variation sur 30 j', async () => {
    await setup();

    expect(screen.getByText(`3,00${NBSP}$${NBSP}US`)).toBeTruthy();
    expect(screen.getByText('2 versions · 3 cartes · 1 sans prix')).toBeTruthy();
    expect(screen.getByText(`0,0 % sur 30 j`)).toBeTruthy();
  });

  it('déplie le graphique de la valeur des cartes actuelles', async () => {
    await setup();

    await fireEvent.press(screen.getByRole('button', { name: /3,00/ }));

    expect(screen.getByText(/pas l’historique de tes achats/)).toBeTruthy();
    expect(mockChart.props?.days.at(-1)).toEqual({
      date: '2026-11-14',
      value: 2,
      compareValue: null,
    });
  });

  it('ouvre le Catalogue filtré depuis une ligne de Complétion', async () => {
    const { onOpenCompletion } = await setup();

    await fireEvent.press(screen.getByRole('button', { name: /Complétion/ }));
    await fireEvent.press(screen.getByText(`2 / 3 · 66${NBSP}%`));

    expect(screen.getByText('ORIGINS')).toBeTruthy();
    expect(onOpenCompletion).toHaveBeenCalledWith('OGN');
  });
});
