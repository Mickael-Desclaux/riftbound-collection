import { newExpansions } from './catalog';

const expansion = (code: string, cardCount = 100) => ({ code, cardCount });

describe('newExpansions', () => {
  it('rend les Extensions apparues depuis le Catalogue enregistré', () => {
    const stored = [expansion('OGN'), expansion('SFD')];
    const latest = [expansion('OGN'), expansion('VEN'), expansion('SFD')];

    expect(newExpansions(stored, latest)).toEqual([expansion('VEN')]);
  });

  it('ne signale rien quand une Extension disparaît ou ne change que de taille', () => {
    const stored = [expansion('OGN'), expansion('SFD')];

    expect(newExpansions(stored, [expansion('OGN', 352)])).toEqual([]);
  });

  it('attend qu’une Extension annoncée ait des cartes pour la signaler', () => {
    const stored = [expansion('OGN')];

    expect(newExpansions(stored, [expansion('OGN'), expansion('VEN', 0)])).toEqual([]);
    expect(
      newExpansions([...stored, expansion('VEN', 0)], [expansion('OGN'), expansion('VEN', 243)]),
    ).toEqual([expansion('VEN', 243)]);
  });

  it('ne signale rien au premier téléchargement du Catalogue', () => {
    expect(newExpansions([], [expansion('OGN')])).toEqual([]);
  });
});
