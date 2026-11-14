/** Libellés de l'écran « État des sources » et des resynchronisations. */
import type { SourceId } from '@/data/schema';
import type { SyncStep } from '@/sync/syncAll';

/** Les sources de l'écran « État des sources », dans l'ordre d'affichage. */
export const SOURCE_LABELS: Record<SourceId, string> = {
  'rifthunt-sets': 'RiftHunt · Extensions',
  'rifthunt-catalog': 'RiftHunt · Catalogue',
  'rifthunt-prices': 'RiftHunt · Prix TCGplayer',
  'cardmarket-prices': 'Cardmarket · Prix',
  'openrift-links': 'OpenRift · Liens vers Cardmarket',
  'exchange-rates': 'Taux de change',
};

/** Les étapes d'une synchronisation, pour dire lesquelles ont échoué. */
export const SYNC_STEP_LABELS: Record<SyncStep, string> = {
  catalog: 'le catalogue RiftHunt',
  cardmarketLinks: 'les liens OpenRift',
  tcgplayerPrices: 'les prix TCGplayer',
  cardmarketPrices: 'les prix Cardmarket',
  exchangeRates: 'les taux de change',
};
