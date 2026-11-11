/**
 * Libellés français des valeurs RiftHunt. Une valeur inconnue (nouvelle rareté,
 * nouveau type…) s'affiche telle quelle plutôt que de disparaître.
 */
import type { PrintingVariant } from '@/domain/catalog';
import type { Finish } from '@/domain/price';

const RARITIES: Record<string, string> = {
  common: 'Commune',
  uncommon: 'Peu commune',
  rare: 'Rare',
  epic: 'Épique',
  showcase: 'Showcase',
  promo: 'Promo',
};

export const VARIANTS: Record<PrintingVariant, string> = {
  normal: 'Normale',
  alternate: 'Alternative',
  overnumbered: 'Overnumbered',
  signature: 'Signée',
  showcase: 'Showcase',
  metal: 'Metal',
};

const TYPES: Record<string, string> = {
  Unit: 'Unité',
  Spell: 'Sort',
  Legend: 'Légende',
  Gear: 'Équipement',
  Rune: 'Rune',
  Battlefield: 'Champ de bataille',
};

const DOMAINS: Record<string, string> = {
  fury: 'Fureur',
  calm: 'Calme',
  mind: 'Esprit',
  body: 'Corps',
  chaos: 'Chaos',
  order: 'Ordre',
  colorless: 'Incolore',
};

/**
 * Les valeurs dans l'ordre des libellés connus (l'ordre du jeu), puis les
 * inconnues par ordre alphabétique.
 */
function inKnownOrder(values: string[], known: Record<string, string>): string[] {
  const order = Object.keys(known);
  const rank = (v: string) => (order.includes(v) ? order.indexOf(v) : order.length);
  return [...values].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

export const orderedRarities = (values: string[]) => inKnownOrder(values, RARITIES);
export const orderedTypes = (values: string[]) => inKnownOrder(values, TYPES);
export const orderedDomains = (values: string[]) => inKnownOrder(values, DOMAINS);

export const rarityLabel = (value: string) => RARITIES[value] ?? value;
export const typeLabel = (value: string) => TYPES[value] ?? value;
export const domainLabel = (value: string) => DOMAINS[value] ?? value;

export const FINISH_LABELS: Record<Finish, string> = { normal: 'Normale', foil: 'Foil' };
