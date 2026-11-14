import { hasPendingError, sourceHealth } from './sourceStatus';

const outcomes = (lastSuccessAt: string | null, lastErrorAt: string | null) => ({
  lastSuccessAt,
  lastErrorAt,
});

describe('hasPendingError', () => {
  it('est faux sans erreur', () => {
    expect(hasPendingError(undefined)).toBe(false);
    expect(hasPendingError(outcomes('2026-11-14T10:00:00Z', null))).toBe(false);
  });

  it('est vrai quand la dernière tentative a échoué', () => {
    expect(hasPendingError(outcomes(null, '2026-11-14T10:00:00Z'))).toBe(true);
    expect(hasPendingError(outcomes('2026-11-14T09:00:00Z', '2026-11-14T10:00:00Z'))).toBe(true);
  });

  it('est faux quand une réussite a suivi l’erreur', () => {
    expect(hasPendingError(outcomes('2026-11-14T11:00:00Z', '2026-11-14T10:00:00Z'))).toBe(false);
  });
});

describe('sourceHealth', () => {
  it('distingue une source jamais contactée, à jour et en échec', () => {
    expect(sourceHealth(undefined)).toBe('never');
    expect(sourceHealth(outcomes(null, null))).toBe('never');
    expect(sourceHealth(outcomes('2026-11-14T11:00:00Z', '2026-11-14T10:00:00Z'))).toBe('ok');
    expect(sourceHealth(outcomes('2026-11-14T09:00:00Z', '2026-11-14T10:00:00Z'))).toBe('failing');
  });
});
