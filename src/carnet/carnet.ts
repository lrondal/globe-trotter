// The Carnet: the Journal view's list (see Journal.byCountry) as the screen shows it, named,
// in order, and narrowed to a search.
import { fold } from '../atlas/cities.ts';
import type { PlaceRef } from '../journal/journal.ts';

/** What the Carnet reads of a Place besides the Journal's list. */
type Lookup = {
  nameOf(place: PlaceRef): string;
  /** Its Note, empty when it has none. */
  noteOf(place: PlaceRef): string;
};

export type CarnetRow = { place: PlaceRef; name: string };
export type CarnetGroup = { countryId: string; name: string; rows: CarnetRow[] };

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'fr');

/**
 * The Countries by name; in each, the Country's own row first, then its other Places by name.
 * With a `query`, accents and case aside: all the Places of a Country whose name holds it,
 * and elsewhere those whose name or Note does.
 */
export function carnetGroups(
  journal: readonly { countryId: string; places: readonly PlaceRef[] }[],
  { nameOf, noteOf }: Lookup,
  query = '',
): CarnetGroup[] {
  const q = fold(query);
  const holds = (text: string) => q === '' || fold(text).includes(q);
  return journal
    .map(({ countryId, places }) => {
      const name = nameOf({ level: 'country', id: countryId });
      const matches = (row: CarnetRow) => holds(name) || holds(row.name) || holds(noteOf(row.place));
      const isCountry = (row: CarnetRow) => row.place.level === 'country';
      const rows = places.map((place) => ({ place, name: nameOf(place) })).filter(matches);
      return {
        countryId,
        name,
        rows: [...rows.filter(isCountry), ...rows.filter((row) => !isCountry(row)).sort(byName)],
      };
    })
    .filter((group) => group.rows.length > 0)
    .sort(byName);
}
