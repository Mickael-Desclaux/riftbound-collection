import type { CatalogEntry } from '../catalogEntry';
import type { PrintingCode } from '../printingCode';

/** Une Version de test ; les valeurs reprennent celles de RiftHunt. */
export function entry(code: string, overrides: Partial<CatalogEntry> = {}): CatalogEntry {
  const [expansionCode = '', collectorNumber = ''] = code.split('-');
  return {
    printingCode: code as PrintingCode,
    name: code,
    expansionCode,
    expansionRank: 0,
    isPromo: false,
    collectorNumber,
    rarity: 'common',
    variant: 'normal',
    type: 'Unit',
    domains: ['fury'],
    ownedQuantity: 0,
    finishes: ['normal', 'foil'],
    price: null,
    imageSmall: null,
    imageNormal: null,
    ...overrides,
  };
}
