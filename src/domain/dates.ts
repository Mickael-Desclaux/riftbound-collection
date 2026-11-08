/** Date du calendrier au format ISO `AAAA-MM-JJ`. */
export type IsoDate = string;

/** Instant au format ISO 8601 complet, en UTC. */
export type IsoDateTime = string;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is IsoDate {
  return typeof value === 'string' && ISO_DATE.test(value) && !Number.isNaN(Date.parse(value));
}
