/** Libellés des filtres actifs ; les libellés des valeurs RiftHunt sont dans `ui/labels`. */
import type { ActiveFilter, PriceRange } from '@/domain/catalogFilters';
import type { Currency } from '@/domain/price';
import { formatPrice } from '@/ui/format';
import { domainLabel, rarityLabel, typeLabel, VARIANTS } from '@/ui/labels';

/** « 5,00 $ CA – 20,00 $ CA », « ≥ 5,00 $ CA », « ≤ 20,00 $ CA ». */
export function priceRangeLabel({ min, max }: PriceRange, currency: Currency): string {
  if (min !== null && max !== null) {
    return `${formatPrice(min, currency)} – ${formatPrice(max, currency)}`;
  }
  return min === null ? `≤ ${formatPrice(max, currency)}` : `≥ ${formatPrice(min, currency)}`;
}

/** Le texte d'une puce de filtre actif. */
export function activeFilterLabel(
  active: ActiveFilter,
  expansionName: (code: string) => string,
  displayCurrency: Currency,
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
    case 'price':
      return priceRangeLabel(active.value, displayCurrency);
  }
}
