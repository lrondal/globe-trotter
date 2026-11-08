// The Journal view (« Carnet »): the Places of Journal.byCountry as the screen lists them,
// named, in order, and narrowed to a search. And the Wishlist view (« Envies »), likewise
// for Journal.wishlist. And a Country's page, for Journal.countryPage.
import { fold } from '../atlas/cities.ts';
import type { CountryGroup, CountryPage, PageGroup, PlaceRef } from './journal.ts';

/** What the Journal view reads of a Place besides the Journal's list. */
type Lookup = {
  nameOf(place: PlaceRef): string;
  /** Its Note, empty when it has none. */
  noteOf(place: PlaceRef): string;
};

export type ViewRow = { place: PlaceRef; name: string };
export type ViewGroup = { countryId: string; name: string; rows: ViewRow[] };

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'fr');

/** What the Wishlist view reads of a Place besides its name and Note. */
type WishLookup = Lookup & {
  /** The name of the Country it is in; empty for a Country. */
  whereOf(place: PlaceRef): string;
};

export type WishRow = { place: PlaceRef; name: string; meta: string };

/**
 * The Wishlist view (« Envies »): its Places by name, each with « Country · first line of its
 * Note », or « Épinglé » when it has neither; and the count line above them.
 */
export function wishlistView(
  wished: readonly PlaceRef[],
  { nameOf, noteOf, whereOf }: WishLookup,
): { count: string; rows: WishRow[] } {
  const rows = wished
    .map((place) => {
      const note = noteOf(place).trim().split('\n')[0];
      return { place, name: nameOf(place), meta: [whereOf(place), note].filter(Boolean).join(' · ') || 'Épinglé' };
    })
    .sort(byName);
  const plural = rows.length > 1 ? 's' : '';
  return { count: `${rows.length} destination${plural} épinglée${plural}`, rows };
}

/** A Region or an Island of a Country's page, named, and its Cities there by name. */
export type ViewBranch = { row: ViewRow; cities: ViewRow[] };

/**
 * A Country's page (see Journal.countryPage), named: its Regions, its Islands and its other
 * Cities, each by name, and the Cities of a Region or an Island by name too.
 */
export function countryView(
  page: CountryPage,
  { nameOf }: Pick<Lookup, 'nameOf'>,
): { regions: ViewBranch[]; islands: ViewBranch[]; otherCities: ViewRow[] } {
  const rows = (places: readonly PlaceRef[]) => places.map((place) => ({ place, name: nameOf(place) })).sort(byName);
  const branches = (groups: readonly PageGroup[]) =>
    groups
      .map(({ place, cities }) => ({ row: { place, name: nameOf(place) }, cities: rows(cities) }))
      .sort((a, b) => byName(a.row, b.row));
  return { regions: branches(page.regions), islands: branches(page.islands), otherCities: rows(page.otherCities) };
}

/**
 * The Countries by name; in each, the Country's own row first, then its other Places by name.
 * With a `query`, accents and case aside: all the Places of a Country whose name holds it,
 * and elsewhere those whose name or Note does.
 */
export function journalView(
  listed: readonly CountryGroup[],
  { nameOf, noteOf }: Lookup,
  query = '',
): ViewGroup[] {
  const q = fold(query);
  const holds = (text: string) => q === '' || fold(text).includes(q);
  return listed
    .map(({ countryId, places }) => {
      const name = nameOf({ level: 'country', id: countryId });
      const matches = (row: ViewRow) => holds(name) || holds(row.name) || holds(noteOf(row.place));
      const isCountry = (row: ViewRow) => row.place.level === 'country';
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
