// The Journal view (« Carnet »): the Places of Journal.byCountry as the screen lists them,
// named, in order, and narrowed to a search. And the Wishlist view (« Envies »): the timeline
// of Journal.plans. And a Country's page, for Journal.countryPage.
import { fold } from '../atlas/cities.ts';
import type { CountryGroup, CountryPage, Mark, PageGroup, Plan, PlaceRef } from './journal.ts';
import { visitDateOf, yearMonthOf } from './visitDate.ts';

/** What the Journal view reads of a Place besides the Journal's list. */
type Lookup = {
  nameOf(place: PlaceRef): string;
  /** Its Note, empty when it has none. */
  noteOf(place: PlaceRef): string;
};

export type ViewRow = { place: PlaceRef; name: string };
export type ViewGroup = { countryId: string; name: string; rows: ViewRow[] };

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'fr');

/** A group of the Wishlist's timeline: its Plans, and whether the user orders them by hand. */
export type PlanGroup<P extends Plan = Plan> = { title: string; plans: P[]; reorderable: boolean };

/** How many months « Prochainement » looks ahead, the current one included. */
const SOON = 12;

/**
 * The Wishlist's timeline, of the Plans in the user's order: « Prochainement » for those
 * planned before twelve months from `today` (YYYY-MM), gone by included, by Planned date;
 * then one group per later year and « Un jour », in the user's order, which they can change.
 * Plans of the same month keep the user's order. Groups with no Plan are left out.
 */
export function planTimeline<P extends Plan>(plans: readonly P[], today: string): PlanGroup<P>[] {
  const { year, month } = yearMonthOf(today);
  const soonEnd = visitDateOf(year + Math.floor((month - 1 + SOON) / 12), ((month - 1 + SOON) % 12) + 1);
  const soon = plans.filter((p) => p.plannedDate !== null && p.plannedDate < soonEnd);
  // Array.prototype.sort is stable: Plans of a month stay in the user's order.
  soon.sort((a, b) => (a.plannedDate! < b.plannedDate! ? -1 : a.plannedDate! > b.plannedDate! ? 1 : 0));
  const years = new Map<string, P[]>();
  for (const plan of plans) {
    if (plan.plannedDate === null || plan.plannedDate < soonEnd) continue;
    const y = plan.plannedDate.slice(0, 4);
    years.set(y, [...(years.get(y) ?? []), plan]);
  }
  return [
    { title: 'Prochainement', plans: soon, reorderable: false },
    ...[...years].sort(([a], [b]) => a.localeCompare(b)).map(([y, list]) => ({ title: y, plans: list, reorderable: true })),
    { title: 'Un jour', plans: plans.filter((p) => p.plannedDate === null), reorderable: true },
  ].filter((group) => group.plans.length > 0);
}

/**
 * A Plan's card line: « 3 destinations », its stops, or « Tout le pays » when it has none, then
 * « · 2 à faire », the Todos left of the Country and of its stops, if any.
 */
export function planSummary(stops: number, todosLeft: number): string {
  const destinations = stops === 0 ? 'Tout le pays' : `${stops} destination${stops > 1 ? 's' : ''}`;
  return todosLeft > 0 ? `${destinations} · ${todosLeft} à faire` : destinations;
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
