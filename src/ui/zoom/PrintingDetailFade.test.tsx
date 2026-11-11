import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { PrintingDetailFade } from './PrintingZoom';

type Blocked = (options: { data: { action: unknown }; repeat: () => void }) => void;

/** Le dernier appel à `usePreventRemove` : retenue active, et ce qu'elle appelle. */
const mockPreventRemove: { active?: boolean; onBlocked?: Blocked } = {};

jest.mock('expo-router', () => ({
  usePreventRemove: (active: boolean, onBlocked: Blocked) => {
    mockPreventRemove.active = active;
    mockPreventRemove.onBlocked = onBlocked;
    return () => {};
  },
}));

describe('PrintingDetailFade', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('retient la fermeture de la fiche le temps de son fondu, puis la relance', async () => {
    await render(
      <PrintingDetailFade>
        <Text>Fiche</Text>
      </PrintingDetailFade>,
    );
    expect(screen.getByText('Fiche')).toBeTruthy();
    expect(mockPreventRemove.active).toBe(true);
    const repeat = jest.fn();

    await act(async () => {
      mockPreventRemove.onBlocked?.({ data: { action: { type: 'GO_BACK' } }, repeat });
    });

    expect(repeat).not.toHaveBeenCalled();
    await act(async () => {
      jest.runAllTimers();
    });
    expect(repeat).toHaveBeenCalled();
    expect(mockPreventRemove.active).toBe(false);
  });
});
