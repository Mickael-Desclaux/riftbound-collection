import { newExpansionsText, newExpansionsTitle } from './newExpansionsText';

const expansion = (name: string) => ({
  code: name.slice(0, 3).toUpperCase(),
  name,
  isPromo: false,
});

describe('newExpansionsText', () => {
  it('annonce une Extension', () => {
    const one = [expansion('Vendetta')];

    expect(newExpansionsTitle(one)).toBe('Nouvelle extension');
    expect(newExpansionsText(one)).toBe('Vendetta est arrivée dans le catalogue.');
  });

  it('annonce plusieurs Extensions ensemble', () => {
    const three = [expansion('Vendetta'), expansion('Radiance'), expansion('Unleashed')];

    expect(newExpansionsTitle(three)).toBe('Nouvelles extensions');
    expect(newExpansionsText(three)).toBe(
      'Vendetta, Radiance et Unleashed sont arrivées dans le catalogue.',
    );
  });
});
