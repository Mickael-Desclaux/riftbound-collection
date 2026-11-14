import { render } from '@testing-library/react-native';
import { Appearance } from 'react-native';

import { useSetting } from '@/data/useSetting';
import type { Theme } from '@/domain/settings';

import { ApplyThemeSetting } from './ApplyThemeSetting';

jest.mock('@/data/useSetting', () => ({ useSetting: jest.fn() }));

const setColorScheme = jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => {});

function withTheme(theme: Theme) {
  jest.mocked(useSetting).mockReturnValue([theme, jest.fn()]);
}

describe('ApplyThemeSetting', () => {
  it.each([
    ['system', 'unspecified'],
    ['light', 'light'],
    ['dark', 'dark'],
  ] as const)('applique le thème « %s » à toute l’app', async (theme, colorScheme) => {
    withTheme(theme);

    await render(<ApplyThemeSetting />);

    expect(setColorScheme).toHaveBeenLastCalledWith(colorScheme);
  });

  it('suit le réglage quand il change', async () => {
    withTheme('dark');
    const view = await render(<ApplyThemeSetting />);

    withTheme('system');
    await view.rerender(<ApplyThemeSetting />);

    expect(setColorScheme).toHaveBeenLastCalledWith('unspecified');
  });
});
