// The Journal view (« Carnet »): the Places of Journal.byCountry as the screen lists them,
// named, in order, and narrowed to a search. And the Wishlist view (« Envies »), likewise
// for Journal.wishlist. And a Country's page, for Journal.countryPage.
import { fold } from '../atlas/cities.ts';
import type { CountryGroup, CountryPage, Mark, PageGroup, PlaceRef } from './journal.ts';

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

/**
 * What picking a Place to wish says (see Journal.wish), given the Mark it had: that it is now
 * « À visiter », which can be undone; or that it was wished, or visited, already.
 */
export function wishNotice(name: string, had: Mark | null): { message: string; undoable: boolean } {
  const said = { wish: 'Déjà dans vos envies', visited: 'Déjà visité' } as const;
  return { message: `${name} · ${had ? said[had] : 'À visiter'}`, undoable: had === null };
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

/** A row of a Country's page: a Region's or an Island's, or a City's, set under its Region or Island. */
export type PageRow = ViewRow & { indented: boolean };
export type PageSection = { title: string; data: PageRow[] };

/**
 * A Country's page as it is shown: « Régions », « Îles » and « Autres villes », those with
 * something in them; each Region or Island followed by its Cities, set under it.
 */
export function countrySections(view: ReturnType<typeof countryView>): PageSection[] {
  const rowsOf = (branches: readonly ViewBranch[]): PageRow[] =>
    branches.flatMap(({ row, cities }) => [
      { ...row, indented: false },
      ...cities.map((city) => ({ ...city, indented: true })),
    ]);
  return [
    { title: 'Régions', data: rowsOf(view.regions) },
    { title: 'Îles', data: rowsOf(view.islands) },
    { title: 'Autres villes', data: view.otherCities.map((row) => ({ ...row, indented: false })) },
  ].filter((section) => section.data.length > 0);
}

/** Where a Place is on its Country's page: its section, and its row there; null when not listed. */
export function rowLocation(
  sections: readonly PageSection[],
  place: PlaceRef,
): { sectionIndex: number; itemIndex: number } | null {
  for (const [sectionIndex, { data }] of sections.entries()) {
    const itemIndex = data.findIndex((row) => row.place.level === place.level && row.place.id === place.id);
    if (itemIndex >= 0) return { sectionIndex, itemIndex };
  }
  return null;
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
