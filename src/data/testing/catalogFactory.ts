/** Petit Catalogue de test, construit à la main pour les requêtes des grilles. */
import type { Card, Catalog, Expansion, Printing } from '@/domain/catalog';
import { printingCodeOf } from '@/domain/printingCode';

export function expansionOf(code: string, overrides: Partial<Expansion> = {}): Expansion {
  return { code, name: code, releasedAt: null, isPromo: false, cardCount: 0, ...overrides };
}

export function cardOf(name: string): Card {
  return { oracleId: `oracle-${name}`, name, type: 'Unit', subtype: null, domains: [], text: null };
}

/** Une Version de la Carte `name`, dans l'Extension et au numéro donnés. */
export function printingOf(expansionCode: string, collectorNumber: string, name: string): Printing {
  return {
    printingCode: printingCodeOf({
      expansionCode,
      collectorNumber,
      riftboundId: `${expansionCode.toLowerCase()}-${collectorNumber}`,
      name,
    }),
    cardOracleId: `oracle-${name}`,
    expansionCode,
    collectorNumber,
    rarity: 'common',
    variant: 'normal',
    finishes: ['normal'],
    imageSmall: `https://images.example/${expansionCode}/${collectorNumber}.webp`,
    imageNormal: null,
    imageLarge: null,
    artist: null,
    rifthuntPrintingId: `rh-${expansionCode}-${collectorNumber}-${name}`,
    tcgId: null,
  };
}

/** Assemble un Catalogue cohérent (une Carte par nom distinct). */
export function catalogOf(expansions: Expansion[], printings: Printing[]): Catalog {
  const names = [...new Set(printings.map((p) => p.cardOracleId.replace(/^oracle-/, '')))];
  return { expansions, cards: names.map(cardOf), printings };
}
