/**
 * Code de version : identifiant lisible d'une Version (`OGN-030a`, `OPP-017-024-metal`).
 * Règle : spec § 4.1. Les Données précieuses désignent les Versions par ce code (ADR 0001).
 *
 * Le type est « marqué » pour qu'une chaîne quelconque ne passe pas pour un code :
 * seul `printingCodeOf` en fabrique.
 */
export type PrintingCode = string & { readonly __brand: 'PrintingCode' };

/** Les champs d'une Version RiftHunt qui déterminent son Code de version. */
export type PrintingCodeInput = {
  /** Code d'Extension RiftHunt (`set`), ex. `ogn`. */
  expansionCode: string;
  /** Numéro avec son suffixe (`collector_number`), ex. `030a`. */
  collectorNumber: string;
  /** Identifiant Riot (`riftbound_id`), ex. `opp-017-024`. */
  riftboundId: string;
  name: string;
};

/**
 * OPP réunit plusieurs vagues de promos, chacune avec sa propre numérotation :
 * la vague (3e segment de `riftbound_id`, ex. `opp-001-298`) fait partie du code.
 */
const MULTI_WAVE_EXPANSIONS = new Set(['OPP']);

/**
 * Éditions promo signalées seulement par une mention à la fin du nom, ex.
 * « Annie, Dark Child (Metal) ». Les autres mentions (« Alternate Art »,
 * « Signature »…) sont déjà portées par le numéro et n'ajoutent rien.
 */
const EDITION_SUFFIXES: Record<string, string> = {
  Metal: 'metal',
  'Top 8': 'top8',
  Champion: 'champion',
};

function editionOf(name: string): string | undefined {
  const mention = /\(([^)]+)\)\s*$/.exec(name)?.[1];
  return mention === undefined ? undefined : EDITION_SUFFIXES[mention];
}

export function printingCodeOf(printing: PrintingCodeInput): PrintingCode {
  const expansion = printing.expansionCode.toUpperCase();
  const parts = [expansion, printing.collectorNumber];
  const wave = printing.riftboundId.split('-')[2];
  if (MULTI_WAVE_EXPANSIONS.has(expansion) && wave !== undefined) {
    parts.push(wave);
  }
  const edition = editionOf(printing.name);
  if (edition !== undefined) {
    parts.push(edition);
  }
  return parts.join('-') as PrintingCode;
}
