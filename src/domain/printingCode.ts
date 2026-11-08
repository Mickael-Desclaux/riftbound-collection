/**
 * Code de version : identifiant lisible d'une Version (`OGN-030a`, `OPP-017-metal`).
 * Les Données précieuses désignent les Versions par ce code (ADR 0001).
 *
 * Le type est « marqué » pour qu'une chaîne quelconque ne passe pas pour un code :
 * le calcul du code arrive avec le ticket #22.
 */
export type PrintingCode = string & { readonly __brand: 'PrintingCode' };
