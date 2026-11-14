import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

import type { IsoDate } from '@/domain/dates';
import type { CustomChartPeriod } from '@/domain/settings';

/** Le jour choisi dans le calendrier, tel que l'utilisateur le voit (heure locale). */
function calendarDay(date: Date): IsoDate {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function pickDate(value: Date, bounds: { minimumDate?: Date; maximumDate: Date }) {
  return new Promise<Date | null>((resolve) => {
    DateTimePickerAndroid.open({
      value,
      mode: 'date',
      ...bounds,
      onChange: (event, date) => resolve(event.type === 'set' && date ? date : null),
    });
  });
}

/**
 * « Dates… » du graphique : le calendrier Android, une fois pour le début,
 * une fois pour la fin (jamais avant le début, jamais après aujourd'hui).
 * `null` si l'utilisateur renonce.
 */
export async function pickDateRange(now: Date): Promise<CustomChartPeriod | null> {
  const monthAgo = new Date(now);
  monthAgo.setMonth(now.getMonth() - 1);
  const from = await pickDate(monthAgo, { maximumDate: now });
  if (!from) return null;
  const to = await pickDate(now, { minimumDate: from, maximumDate: now });
  if (!to) return null;
  return { from: calendarDay(from), to: calendarDay(to) };
}
