/**
 * Libellés français des valeurs RiftHunt. Une valeur inconnue (nouvelle rareté,
 * nouveau type…) s'affiche telle quelle plutôt que de disparaître.
 */
import type { PrintingVariant } from '@/domain/catalog';
import type { ActiveFilter } from '@/domain/catalogFilters';

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

export const rarityLabel = (value: string) => RARITIES[value] ?? value;
export const typeLabel = (value: string) => TYPES[value] ?? value;
export const domainLabel = (value: string) => DOMAINS[value] ?? value;

/** Le texte d'une puce de filtre actif. */
export function activeFilterLabel(
  active: ActiveFilter,
  expansionName: (code: string) => string,
): string {
  switch (active.criterion) {
    case 'expansion':
      return expansionName(active.value);
    case 'promo':
      return 'Extensions promo';
    case 'rarity':
      return rarityLabel(active.value);
    case 'variant':
      return VARIANTS[active.value];
    case 'type':
      return typeLabel(active.value);
    case 'domain':
      return domainLabel(active.value);
    case 'ownership':
      return active.value === 'owned' ? 'Possédées' : 'Manquantes';
  }
}
