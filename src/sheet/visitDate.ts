import { MONTHS, yearMonthOf, type VisitDates } from '@/journal/visitDate';

const capitalized = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The Visit dates of a Place as its sheet shows them: « Avril 2024 » for a single month,
 * « Mars – juillet 2024 » within a year, « 2019 – 2024 » across years.
 */
export function formatVisitDates({ from, to }: VisitDates) {
  const start = yearMonthOf(from);
  const end = yearMonthOf(to);
  if (start.year !== end.year) return `${start.year} – ${end.year}`;
  const months = from === to ? MONTHS[start.month - 1] : `${MONTHS[start.month - 1]} – ${MONTHS[end.month - 1]}`;
  return `${capitalized(months)} ${start.year}`;
}
