import { fireEvent, render, screen } from '@testing-library/react-native';

import type { ExchangeRate } from '@/domain/exchangeRates';
import type { PriceRecord } from '@/domain/priceRecords';
import type { PriceLineChartProps } from '@/ui/PriceLineChart';

import { PriceHistorySection, type PriceHistorySectionProps } from './PriceHistorySection';

/** Le dernier graphique dessiné, pour lire ce qu'il a reçu. */
const mockChart: { props?: PriceLineChartProps } = {};
jest.mock('@/ui/PriceLineChart', () => ({
  PriceLineChart: (props: PriceLineChartProps) => {
    mockChart.props = props;
    return null;
  },
}));

const TODAY = '2026-11-11';
const rates: ExchangeRate[] = [
  {
    date: '2026-10-01',
    baseCurrency: 'USD',
    quoteCurrency: 'EUR',
    rate: 0.9,
    source: 'frankfurter',
  },
];
type History = Pick<PriceRecord, 'recordedAt' | 'value'>[];

/** Jinx sur TCGplayer : 2,80 $ US depuis le 3 novembre, 3,08 $ US depuis le 8. */
const tcgplayer: History = [
  { recordedAt: '2026-11-03T17:00:00.000Z', value: 2.8 },
  { recordedAt: '2026-11-08T17:00:00.000Z', value: 3.08 },
];
const cardmarket: History = [{ recordedAt: '2026-11-06T01:45:56.000Z', value: 3.5 }];

async function setup(props: Partial<PriceHistorySectionProps> = {}) {
  const handlers = {
    onPeriodChange: jest.fn(),
    onCompareChange: jest.fn(),
    pickDates: jest.fn(),
  };
  await render(
    <PriceHistorySection
      source="tcgplayer"
      finish="foil"
      history={tcgplayer}
      currency="USD"
      otherSource="cardmarket"
      otherHistory={cardmarket}
      otherCurrency="EUR"
      displayCurrency="EUR"
      rates={rates}
      today={TODAY}
      period="7d"
      compare={false}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe('PriceHistorySection', () => {
  it('trace un point par jour depuis le premier relevé, converti au taux de sa date', async () => {
    await setup();

    const days = mockChart.props?.days ?? [];
    expect(days.map((day) => day.date)).toEqual([
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
    ]);
    expect(days[0]?.value).toBeCloseTo(2.52, 6);
    expect(mockChart.props?.compare).toBe(false);
    expect(days.every((day) => day.compareValue === null)).toBe(true);
  });

  it('donne la variation sur la période, en devise d’origine', async () => {
    await setup();

    // 2,80 → 3,08 $ US : +10 %.
    expect(screen.getByText(/\+10,0\s%\ssur la période/)).toBeTruthy();
  });

  it('signale un historique en cours de constitution', async () => {
    await setup({ period: '30d' });

    expect(screen.getByText(/Historique en cours de constitution/)).toBeTruthy();
  });

  it('dit qu’il n’y a pas de prix, sans graphique, quand la case n’a aucun relevé', async () => {
    mockChart.props = undefined;
    await setup({ history: [] });

    expect(screen.getByText(/Pas de prix TCGplayer Foil/)).toBeTruthy();
    expect(mockChart.props).toBeUndefined();
  });

  it('retient la période choisie', async () => {
    const { onPeriodChange } = await setup();

    await fireEvent.press(screen.getByRole('button', { name: '90 j' }));

    expect(onPeriodChange).toHaveBeenCalledWith('90d');
  });

  it('choisit des dates avec le sélecteur, puis les retient', async () => {
    const pickDates = jest.fn().mockResolvedValue({ from: '2026-10-01', to: '2026-10-31' });
    const { onPeriodChange } = await setup({ pickDates });

    await fireEvent.press(screen.getByRole('button', { name: 'Dates…' }));

    expect(onPeriodChange).toHaveBeenCalledWith({ from: '2026-10-01', to: '2026-10-31' });
  });

  it('compare avec l’autre source, en pointillés, à partir de son premier relevé', async () => {
    const { onCompareChange } = await setup({ compare: true });

    const days = mockChart.props?.days ?? [];
    expect(mockChart.props?.compare).toBe(true);
    expect(days.find((day) => day.compareValue !== null)?.date).toBe('2026-11-06');
    await fireEvent(
      screen.getByRole('switch', { name: 'Comparer avec Cardmarket' }),
      'valueChange',
      false,
    );
    expect(onCompareChange).toHaveBeenCalledWith(false);
  });

  it('aligne par date une autre source dont l’historique est plus ancien', async () => {
    await setup({
      history: [{ recordedAt: '2026-11-09T17:00:00.000Z', value: 3 }],
      otherHistory: [{ recordedAt: '2026-11-06T01:45:56.000Z', value: 3.5 }],
      compare: true,
    });

    const days = mockChart.props?.days ?? [];
    expect(days.map((day) => day.date)[0]).toBe('2026-11-06');
    expect(days.at(-1)?.date).toBe(TODAY);
    expect(days.find((day) => day.value !== null)?.date).toBe('2026-11-09');
  });
});
