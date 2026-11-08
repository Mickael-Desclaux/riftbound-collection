import { render, screen } from '@testing-library/react-native';

import { PlaceholderScreen } from './PlaceholderScreen';

describe('PlaceholderScreen', () => {
  it('affiche le titre et la description', async () => {
    await render(<PlaceholderScreen title="Catalogue" description="Bientôt ici." />);

    expect(screen.getByText('Catalogue')).toBeTruthy();
    expect(screen.getByText('Bientôt ici.')).toBeTruthy();
  });
});
