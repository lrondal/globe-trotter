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

const capitalized = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The year and the month (1 to 12) of a YYYY-MM Visit date. */
export const yearMonthOf = (visitDate: string) => ({
  year: Number(visitDate.slice(0, 4)),
  month: Number(visitDate.slice(5, 7)),
});

/** A YYYY-MM Visit date, of a year and a month (1 to 12). */
export const visitDateOf = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;

/**
 * The Visit dates of a Place as its sheet shows them: « Avril 2024 » for a single month,
 * « Mars – juillet 2024 » within a year, « 2019 – 2024 » across years.
 */
export function formatVisitDates({ from, to }: { from: string; to: string }) {
  const start = yearMonthOf(from);
  const end = yearMonthOf(to);
  if (start.year !== end.year) return `${start.year} – ${end.year}`;
  const months = from === to ? MONTHS[start.month - 1] : `${MONTHS[start.month - 1]} – ${MONTHS[end.month - 1]}`;
  return `${capitalized(months)} ${start.year}`;
}
