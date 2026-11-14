import { fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeSettings } from './ThemeSettings';

describe('ThemeSettings', () => {
  it('montre le thème choisi et en change', async () => {
    const onThemeChange = jest.fn();
    await render(<ThemeSettings theme="system" onThemeChange={onThemeChange} />);

    expect(screen.getByRole('button', { name: 'Système' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Sombre' })).not.toBeSelected();

    await fireEvent.press(screen.getByRole('button', { name: 'Clair' }));

    expect(onThemeChange).toHaveBeenCalledWith('light');
  });
});
