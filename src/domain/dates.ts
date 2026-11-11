/** Date du calendrier au format ISO `AAAA-MM-JJ`. */
export type IsoDate = string;

/** Plage de dates, bornes comprises. */
export type DateRange = { start: IsoDate; end: IsoDate };

/** Instant au format ISO 8601 complet, en UTC. */
export type IsoDateTime = string;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is IsoDate {
  return typeof value === 'string' && ISO_DATE.test(value) && !Number.isNaN(Date.parse(value));
}

/** La date du calendrier UTC d'un instant. */
export function toIsoDate(at: Date): IsoDate {
  return at.toISOString().slice(0, 10);
}

/** La date `days` jours plus tard (ou plus tôt si `days` est négatif). */
export function addDays(date: IsoDate, days: number): IsoDate {
  const at = new Date(`${date}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return toIsoDate(at);
}
