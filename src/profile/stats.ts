// The Profile's line of statistics, in French.
import type { VisitedCounts } from '../journal/journal.ts';

/** French puts one, and none, in the singular. */
const count = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** « 16 pays et territoires · 23 régions · 41 villes visités ». */
export function statsLine({ countries, regions, cities }: VisitedCounts): string {
  return [
    count(countries, 'pays ou territoire', 'pays et territoires'),
    count(regions, 'région', 'régions'),
    count(cities, 'ville', 'villes'),
  ].join(' · ') + ' visités';
}
