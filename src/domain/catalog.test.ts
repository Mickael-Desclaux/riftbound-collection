import { newExpansions } from './catalog';

const expansion = (code: string) => ({ code, name: code });

describe('newExpansions', () => {
  it('rend les Extensions apparues depuis le Catalogue enregistré', () => {
    const stored = [expansion('OGN'), expansion('SFD')];
    const latest = [expansion('OGN'), expansion('VEN'), expansion('SFD')];

    expect(newExpansions(stored, latest)).toEqual([expansion('VEN')]);
  });

  it('ne signale rien quand une Extension disparaît ou ne change que de taille', () => {
    expect(newExpansions([expansion('OGN'), expansion('SFD')], [expansion('OGN')])).toEqual([]);
  });

  it('ne signale rien au premier téléchargement du Catalogue', () => {
    expect(newExpansions([], [expansion('OGN')])).toEqual([]);
  });
});
