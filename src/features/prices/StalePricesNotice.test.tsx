import { fireEvent, render, screen } from '@testing-library/react-native';

import { StalePricesNotice } from './StalePricesNotice';

const publishedAt = '2026-11-08T17:00:00.000Z';

describe('StalePricesNotice', () => {
  it('reste caché tant que les prix ont moins de 48 h', async () => {
    await render(
      <StalePricesNotice
        latestPublishedAt={publishedAt}
        now={new Date('2026-11-10T16:00:00Z')}
        onRefresh={jest.fn()}
      />,
    );

    expect(screen.queryByText(/plus de 48 h/)).toBeNull();
  });

  it('signale des prix de plus de 48 h, et propose de les mettre à jour', async () => {
    const onRefresh = jest.fn();
    await render(
      <StalePricesNotice
        latestPublishedAt={publishedAt}
        now={new Date('2026-11-11T09:00:00Z')}
        onRefresh={onRefresh}
      />,
    );

    expect(screen.getByText(/plus de 48 h/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Mettre à jour' }));
    expect(onRefresh).toHaveBeenCalled();
  });
});
