// The Visit date, YYYY-MM: month-precision, so strings of it compare in the order of their months.

/** The months, in French, January first. */
export const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
] as const;

/** The year and the month (1 to 12) of a YYYY-MM Visit date. */
export const yearMonthOf = (visitDate: string) => ({
  year: Number(visitDate.slice(0, 4)),
  month: Number(visitDate.slice(5, 7)),
});

/** A YYYY-MM Visit date, of a year and a month (1 to 12). */
export const visitDateOf = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;

/** The month of `date`, in local time, as a Visit date. */
export const monthOf = (date: Date) => visitDateOf(date.getFullYear(), date.getMonth() + 1);

/** The Visit dates a Place shows: its own, from and to alike, or the range of those inside it. */
export type VisitDates = { from: string; to: string };
