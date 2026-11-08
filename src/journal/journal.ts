// The Journal: the user's Places and the rules over them. The only module that writes.
// Every write goes through to the injected SQLite database at once; reads come from a copy
// held in memory, loaded when the Journal opens, so the globe can ask for every Country's
// Status on each change without a query per Country.
import type { Database } from './database.ts';
import type { PhotoFiles } from './photoFiles.ts';
import { monthOf, type VisitDates } from './visitDate.ts';

export type Mark = 'visited' | 'wish';
export type Status = Mark | 'unexplored';
/** An Island is marked independently of its Country: neither one's Status reaches the other. */
export type PlaceRef = { level: 'country' | 'island' | 'region' | 'city'; id: string };

/**
 * A City as the Journal keeps it: where it is, copied from the built-in list when it enters
 * the Journal, so the Journal never needs the list to know it. A City of the list's id is its
 * GeoNames id; a Custom City's is generated, and starts with `c-`.
 */
export type City = {
  level: 'city';
  id: string;
  name: string;
  lon: number;
  lat: number;
  countryId: string;
  /** The Island it is on, if any: then it is in no Region, and its Status reaches the Island only. */
  islandId?: string;
  regionId?: string;
  /** A Custom City, which the user can rename and move. */
  custom?: true;
};

/** A point of the globe, in degrees. */
export type Point = { lon: number; lat: number };

/** The Places a point is in, by id: what a City keeps of them. */
export type PlaceIds = { countryId: string; islandId?: string; regionId?: string };

type Options = {
  db: Database;
  atlas: {
    /** The reference Places the Journal counts over. */
    places: readonly PlaceRef[];
    /** The Place a Place is inside, whose Status it reaches: a Region's Country. */
    containerOf(place: PlaceRef): PlaceRef | null;
    /** The Places at a point: its Country, and the Island or the Region it is in; null at sea. */
    locate(point: Point): Promise<PlaceIds | null>;
    /**
     * The Country a Country, Island or Region belongs to, by id: an Island's too, though its
     * Status does not reach it. A City's is the Journal's to tell.
     */
    countryOf(place: PlaceRef): string;
  };
  /** Where Photos' files are copied; none is needed until a Photo is added. */
  files?: PhotoFiles;
  now?: () => Date;
};

/** A Place as the Journal records it. A Country has a record only while it has a Mark or content. */
export type Place = PlaceRef & {
  mark: Mark | null;
  /** Month-precision, YYYY-MM. Only a Visited Place has one. */
  visitDate: string | null;
  /** The Place's Note; empty when it has none. */
  note: string;
  /** The Photo the user chose as its Cover photo, if any: it may have gone since (see coverPhoto). */
  coverPhotoId: number | null;
  /** A Country's Planned date, YYYY-MM, while it is a Plan; null for « Un jour ». */
  plannedDate: string | null;
  /**
   * Its place among its peers, set by the user: a Country's among the Plans while it is one; a
   * Region's, Island's or City's in its Country's Itinerary while it is marked Wish.
   */
  position: number | null;
};

/** A Country holding a Place marked Wish, and the month it is meant for (see Journal.plans). */
export type Plan = { countryId: string; plannedDate: string | null };

/** The Places of the Journal view belonging to one Country, by its id. */
export type CountryGroup = { countryId: string; places: PlaceRef[] };

/** A Region or an Island of a Country's page, and its Cities there. */
export type PageGroup = { place: PlaceRef & { level: 'region' | 'island' }; cities: PlaceRef[] };

/** What a Country's page lists of the Journal (see Journal.countryPage). */
export type CountryPage = { regions: PageGroup[]; islands: PageGroup[]; otherCities: PlaceRef[] };

/** How many Places of each kind are Visited (see Journal.visitedCounts). */
export type VisitedCounts = { countries: number; regions: number; cities: number };

/** A checklist item of a Place. */
export type Todo = { id: number; text: string; done: boolean };

/**
 * An image belonging to one Place: the names of its copy and its thumbnail in the app's
 * PhotoFiles, and when it was added, an ISO date-time.
 */
export type Photo = { id: number; place: PlaceRef; file: string; thumbnail: string; addedAt: string; caption: string };

/** The longest Caption, in characters. */
export const CAPTION_MAX = 200;

/** Schema changes, in order: the database records how many it has run in `user_version`. */
const MIGRATIONS = [
  // A Place is known by its level and id together: Country and City ids are both numeric.
  `CREATE TABLE places (
    level TEXT NOT NULL,
    id TEXT NOT NULL,
    mark TEXT,
    visit_date TEXT,
    note TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (level, id)
  )`,
  // A Place's Todos are in the order of `position`, which the user sets by hand.
  `CREATE TABLE todos (
    id INTEGER PRIMARY KEY,
    level TEXT NOT NULL,
    place_id TEXT NOT NULL,
    text TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL
  )`,
  // A City is in the Journal from its first Mark or content until it is Deleted; its Mark
  // and Note are in places, like any Place's.
  `CREATE TABLE cities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    lon REAL NOT NULL,
    lat REAL NOT NULL,
    country_id TEXT NOT NULL,
    island_id TEXT,
    region_id TEXT
  )`,
  // A Custom City is a City the user dropped on the globe, rather than one of the list.
  `ALTER TABLE cities ADD COLUMN custom INTEGER NOT NULL DEFAULT 0`,
  // A Place's Photos are in the order they were added, which is the order of their ids. An id
  // is never given twice, so a Cover photo chosen and gone never comes back as another Photo.
  `CREATE TABLE photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL,
    place_id TEXT NOT NULL,
    file TEXT NOT NULL,
    thumbnail TEXT NOT NULL,
    added_at TEXT NOT NULL,
    caption TEXT NOT NULL DEFAULT ''
  )`,
  `ALTER TABLE places ADD COLUMN cover_photo_id INTEGER`,
  // A Country's Planned date, YYYY-MM, while it is a Plan.
  `ALTER TABLE places ADD COLUMN planned_date TEXT`,
  // A Place's place among its peers, which the user sets by hand: a Country's among the Plans, a
  // stop's in its Itinerary.
  `ALTER TABLE places ADD COLUMN position INTEGER`,
];

/** A month, YYYY-MM. */
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Runs `writes` all together or not at all. */
function transaction(db: Database, writes: () => void) {
  db.exec('BEGIN');
  try {
    writes();
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function migrate(db: Database) {
  const [{ user_version: done }] = db.all<{ user_version: number }>('PRAGMA user_version');
  if (done >= MIGRATIONS.length) return;
  transaction(db, () => {
    for (const migration of MIGRATIONS.slice(done)) db.exec(migration);
    db.exec(`PRAGMA user_version = ${MIGRATIONS.length}`);
  });
}

type Row = {
  id: string;
  level: PlaceRef['level'];
  mark: Mark | null;
  visit_date: string | null;
  note: string;
  cover_photo_id: number | null;
  planned_date: string | null;
  position: number | null;
};

type TodoRow = { id: number; level: PlaceRef['level']; place_id: string; text: string; done: number };

type PhotoRow = {
  id: number;
  level: PlaceRef['level'];
  place_id: string;
  file: string;
  thumbnail: string;
  added_at: string;
  caption: string;
};

const toPhoto = (row: PhotoRow): Photo => ({
  id: row.id,
  place: { level: row.level, id: row.place_id },
  file: row.file,
  thumbnail: row.thumbnail,
  addedAt: row.added_at,
  caption: row.caption,
});

/** Photos' files are copied only once a Photo is added: the Journal opens without them. */
const NO_FILES: PhotoFiles = {
  copy: () => Promise.reject(new Error('No PhotoFiles to copy Photos into')),
  remove: () => {},
};

type CityRow = {
  id: string;
  name: string;
  lon: number;
  lat: number;
  country_id: string;
  island_id: string | null;
  region_id: string | null;
  custom: number;
};

const toCity = (row: CityRow): City => ({
  level: 'city',
  id: row.id,
  name: row.name,
  lon: row.lon,
  lat: row.lat,
  countryId: row.country_id,
  ...(row.island_id ? { islandId: row.island_id } : {}),
  ...(row.region_id ? { regionId: row.region_id } : {}),
  ...(row.custom ? { custom: true } : {}),
});

/** A Place given with what the Journal keeps of it: a City from the list, entering the Journal. */
const isCity = (place: PlaceRef | City): place is City => place.level === 'city' && 'countryId' in place;

const toPlace = (row: Row): Place => ({
  level: row.level,
  id: row.id,
  mark: row.mark,
  visitDate: row.visit_date,
  note: row.note,
  coverPhotoId: row.cover_photo_id,
  plannedDate: row.planned_date,
  position: row.position,
});

const keyOf = (place: PlaceRef) => `${place.level}:${place.id}`;

/** The position of a Place added at the end of `list`, its peers. */
const nextPosition = (list: readonly Place[]) => Math.max(-1, ...list.map((p) => p.position ?? -1)) + 1;

/** What a Country keeps as a Plan. */
type PlanFields = Pick<Place, 'plannedDate' | 'position'>;
const planFieldsOf = ({ plannedDate, position }: Place): PlanFields => ({ plannedDate, position });

/** In the user's order: by position, any without one last. */
const byPosition = (a: Place, b: Place) => (a.position ?? Infinity) - (b.position ?? Infinity);

/** Visited outranks Wish, which outranks Unexplored. */
const RANK: Record<Status, number> = { unexplored: 0, wish: 1, visited: 2 };
/** The Place of a key from keyOf: levels never hold a colon. */
const placeOf = (key: string): PlaceRef => {
  const colon = key.indexOf(':');
  return { level: key.slice(0, colon) as PlaceRef['level'], id: key.slice(colon + 1) };
};

export function openJournal({ db, atlas, files = NO_FILES, now = () => new Date() }: Options) {
  migrate(db);
  const places = new Map(
    db.all<Row>('SELECT id, level, mark, visit_date, note, cover_photo_id, planned_date, position FROM places').map((row) => [keyOf(row), toPlace(row)]),
  );
  /** The Todos of each Place that has some, in order. */
  const todos = new Map<string, Todo[]>();
  for (const row of db.all<TodoRow>('SELECT id, level, place_id, text, done FROM todos ORDER BY position')) {
    const key = keyOf({ level: row.level, id: row.place_id });
    todos.set(key, [...(todos.get(key) ?? []), { id: row.id, text: row.text, done: row.done === 1 }]);
  }
  let lastTodoId = Math.max(0, ...[...todos.values()].flat().map((todo) => todo.id));
  /** The Photos of each Place that has some, in the order they were added. */
  const photos = new Map<string, Photo[]>();
  for (const row of db.all<PhotoRow>('SELECT id, level, place_id, file, thumbnail, added_at, caption FROM photos ORDER BY id')) {
    const photo = toPhoto(row);
    photos.set(keyOf(photo.place), [...(photos.get(keyOf(photo.place)) ?? []), photo]);
  }
  /** The last id given to a Photo, deleted since or not. */
  let lastPhotoId = db.all<{ seq: number }>("SELECT seq FROM sqlite_sequence WHERE name = 'photos'")[0]?.seq ?? 0;
  const cities = new Map(
    db
      .all<CityRow>('SELECT id, name, lon, lat, country_id, island_id, region_id, custom FROM cities')
      .map((row) => [row.id, toCity(row)]),
  );
  /** The Place whose Status a Place reaches: a City's Island, or else its Region, or else its Country. */
  const containerOf = (place: PlaceRef): PlaceRef | null => {
    if (place.level !== 'city') return atlas.containerOf(place);
    const city = cities.get(place.id);
    if (!city) return null;
    if (city.islandId) return { level: 'island', id: city.islandId };
    return city.regionId ? { level: 'region', id: city.regionId } : { level: 'country', id: city.countryId };
  };
  /**
   * The Country a Place belongs to, by id: an Island's too, though its Status does not reach
   * it. Undefined for a City not in the Journal.
   */
  const countryOf = (place: PlaceRef): string | undefined =>
    place.level === 'city' ? cities.get(place.id)?.countryId : atlas.countryOf(place);
  /** Records a City in the Journal, or records it anew. */
  const keep = (city: City) => {
    const row: CityRow = {
      id: city.id,
      name: city.name,
      lon: city.lon,
      lat: city.lat,
      country_id: city.countryId,
      island_id: city.islandId ?? null,
      region_id: city.regionId ?? null,
      custom: city.custom ? 1 : 0,
    };
    db.run(
      'INSERT OR REPLACE INTO cities (id, name, lon, lat, country_id, island_id, region_id, custom) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [row.id, row.name, row.lon, row.lat, row.country_id, row.island_id, row.region_id, row.custom],
    );
    cities.set(row.id, toCity(row));
  };
  /** The Custom City `id` named `name`, at `point` in the Places `ids`. */
  const customCityAt = (id: string, name: string, point: Point, ids: PlaceIds): City => ({
    level: 'city',
    id,
    name,
    ...point,
    ...ids,
    custom: true,
  });
  /** A Custom City of the Journal: only those can be renamed and moved. */
  const customCity = (id: string): City => {
    const city = cities.get(id);
    if (!city?.custom) throw new Error(`No Custom City ${id}`);
    return city;
  };
  /** Puts a City of the list in the Journal, unless it is there already. Returns whether it was not. */
  const enter = (place: PlaceRef | City): boolean => {
    if (!isCity(place) || cities.has(place.id)) return false;
    keep(place);
    return true;
  };
  /** Takes a City back out of the Journal, with nothing of its own left. */
  const leave = (place: PlaceRef) => {
    db.run('DELETE FROM cities WHERE id = ?', [place.id]);
    cities.delete(place.id);
  };
  /** The list holding the Todo `id`, under its Place's key, and the Todo's index in it. */
  const findTodo = (id: number) => {
    for (const [key, list] of todos) {
      const index = list.findIndex((todo) => todo.id === id);
      if (index >= 0) return { key, list, index };
    }
    throw new Error(`No Todo ${id}`);
  };
  /** A Photo of the Journal, by id. */
  const findPhoto = (id: number): Photo => {
    for (const list of photos.values()) {
      const photo = list.find((p) => p.id === id);
      if (photo) return photo;
    }
    throw new Error(`No Photo ${id}`);
  };
  /** Records `list` as the Todos of the Place `key`, in order: positions run 0, 1, 2… */
  const setOrder = (key: string, list: Todo[]) => {
    list.forEach((todo, position) => db.run('UPDATE todos SET position = ? WHERE id = ?', [position, todo.id]));
    if (list.length > 0) todos.set(key, list);
    else todos.delete(key);
  };

  /** The Journal's record of `place`, or a blank one when it has none. */
  const recordOf = (place: PlaceRef): Place =>
    places.get(keyOf(place)) ?? {
      level: place.level,
      id: place.id,
      mark: null,
      visitDate: null,
      note: '',
      coverPhotoId: null,
      plannedDate: null,
      position: null,
    };
  const hasContent = (place: Place) => place.note !== '' || todos.has(keyOf(place)) || photos.has(keyOf(place));
  /**
   * Records `place`, or forgets it once it holds nothing: not even a choice of Cover photo, or
   * what a Plan keeps of its Country.
   */
  const save = (place: Place) => {
    const kept = place.coverPhotoId !== null || place.plannedDate !== null || place.position !== null;
    if (place.mark === null && !kept && !hasContent(place)) {
      db.run('DELETE FROM places WHERE level = ? AND id = ?', [place.level, place.id]);
      places.delete(keyOf(place));
      return;
    }
    db.run(
      'INSERT OR REPLACE INTO places (level, id, mark, visit_date, note, cover_photo_id, planned_date, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [place.level, place.id, place.mark, place.visitDate, place.note, place.coverPhotoId, place.plannedDate, place.position],
    );
    places.set(keyOf(place), place);
  };

  /** A Place and the Places it is inside, innermost first: a City, its Region, its Country. */
  const chainOf = (place: PlaceRef): PlaceRef[] => {
    const chain = [place];
    for (let up = containerOf(place); up; up = containerOf(up)) chain.push(up);
    return chain;
  };
  /**
   * The Places right inside `place` that hold something, or hold a Place that does: a
   * Country's Region without a record of its own, say, holding a marked City.
   */
  const inside = (place: PlaceRef): PlaceRef[] => {
    const key = keyOf(place);
    const found = new Map<string, PlaceRef>();
    for (const p of places.values()) {
      const chain = chainOf(p);
      const at = chain.findIndex((up) => keyOf(up) === key);
      if (at > 0) found.set(keyOf(chain[at - 1]), chain[at - 1]);
    }
    return [...found.values()];
  };
  const photosInside = (place: PlaceRef): Photo[] => {
    const key = keyOf(place);
    return [...photos.values()]
      .filter(([{ place: owner }]) => chainOf(owner).slice(1).some((up) => keyOf(up) === key))
      .flat()
      .sort((a, b) => a.id - b.id);
  };
  /**
   * The Cover photo of a Place: the one chosen, while it is still the Place's or inside it;
   * or else its first own Photo, or else the first inside it. Only its own with `ownOnly`.
   */
  const coverPhoto = (place: PlaceRef, ownOnly = false): Photo | null => {
    const own = photos.get(keyOf(place)) ?? [];
    const candidates = ownOnly ? own : [...own, ...photosInside(place)];
    const chosen = recordOf(place).coverPhotoId;
    return candidates.find((photo) => photo.id === chosen) ?? candidates[0] ?? null;
  };
  /** The highest of a Place's own Mark and the Statuses of the Places inside it. */
  const statusOf = (place: PlaceRef): Status => {
    let status: Status = recordOf(place).mark ?? 'unexplored';
    for (const child of inside(place)) {
      const own = statusOf(child);
      if (RANK[own] > RANK[status]) status = own;
    }
    return status;
  };

  /**
   * The last change of Mark: the Place, its Mark, Visit date and position before the change,
   * whether the change put it in the Journal, a City of the list, and what its Country kept
   * as a Plan before and after it.
   */
  let undoable: {
    place: PlaceRef;
    mark: Mark | null;
    visitDate: string | null;
    position: number | null;
    entered: boolean;
    country: { id: string; before: PlanFields; after: PlanFields } | null;
  } | null = null;

  /** Sets a Place's Mark; a City given whole enters the Journal with it, if not there yet. */
  const mark = (place: PlaceRef | City, mark: Mark | null) => {
    const before = recordOf(place);
    const countryId = isCity(place) ? place.countryId : countryOf(place);
    const country = countryId === undefined ? null : recordOf({ level: 'country', id: countryId });
    const planned = place.level === 'country' ? before.plannedDate : null;
    // The Visit date belongs to the visit: marking Visited dates it, the month planned for it if
    // gone by, else the current one; leaving Visited drops it.
    const thisMonth = monthOf(now());
    const visitDate =
      mark === 'visited' ? (before.visitDate ?? (planned && planned < thisMonth ? planned : thisMonth)) : null;
    const wasPlan = countryId !== undefined && planIds().has(countryId);
    let entered = false;
    transaction(db, () => {
      entered = enter(place);
      // A stop newly wished goes last in its Itinerary; one no longer wished leaves it. A
      // Country's own position is its place among the Plans, seen to below.
      const position =
        place.level === 'country'
          ? before.position
          : mark !== 'wish' || countryId === undefined
            ? null
            : before.mark === 'wish'
              ? before.position
              : nextPosition(itinerary(countryId));
      // A Country marked Visited has been to: its Planned date gives way to the Visit date.
      save({ ...before, mark, visitDate, position, plannedDate: mark === 'visited' ? null : before.plannedDate });
      if (countryId === undefined) return;
      dropPlanIfNoLongerOne(countryId);
      // A new Plan comes last.
      if (!wasPlan && planIds().has(countryId)) save({ ...recordOf({ level: 'country', id: countryId }), position: nextPosition(plans()) });
    });
    const after = countryId === undefined ? null : recordOf({ level: 'country', id: countryId });
    undoable = {
      place: { level: place.level, id: place.id },
      mark: before.mark,
      visitDate: before.visitDate,
      position: before.position,
      entered,
      country: country && after && { id: country.id, before: planFieldsOf(country), after: planFieldsOf(after) },
    };
  };

  /**
   * Forgets the Photos `ids` as anyone's Cover photo: their ids may be given to Photos added
   * later, which no Place chose.
   */
  const forgetCovers = (ids: ReadonlySet<number>) => {
    for (const record of [...places.values()]) {
      if (record.coverPhotoId !== null && ids.has(record.coverPhotoId)) save({ ...record, coverPhotoId: null });
    }
  };
  /**
   * Takes a Place's Todos and Photos, for a Clear or a Delete, inside a transaction. Returns the
   * names of the Photos' files, for files.remove once it is over.
   */
  const takeContent = (place: PlaceRef): string[] => {
    const key = keyOf(place);
    const taken = photos.get(key) ?? [];
    db.run('DELETE FROM todos WHERE level = ? AND place_id = ?', [place.level, place.id]);
    db.run('DELETE FROM photos WHERE level = ? AND place_id = ?', [place.level, place.id]);
    todos.delete(key);
    photos.delete(key);
    forgetCovers(new Set(taken.map((photo) => photo.id)));
    return taken.flatMap(({ file, thumbnail }) => [file, thumbnail]);
  };
  /** After a Clear or a Delete of `place`: its change of Mark is no longer for undo to give back. */
  const forgetUndo = (place: PlaceRef) => {
    if (undoable && keyOf(undoable.place) === keyOf(place)) undoable = null;
  };

  /** A Country no longer a Plan has nothing planned: its Planned date and place among the Plans go. */
  const dropPlanIfNoLongerOne = (countryId: string) => {
    if (!planIds().has(countryId)) save({ ...recordOf({ level: 'country', id: countryId }), plannedDate: null, position: null });
  };

  /** The Countries holding a Place marked Wish, by id: the Plans. */
  const planIds = (): Set<string> => {
    const ids = new Set<string>();
    for (const record of places.values()) {
      const countryId = record.mark === 'wish' ? countryOf(record) : undefined;
      if (countryId !== undefined) ids.add(countryId);
    }
    return ids;
  };

  /** The Plans' Countries, in the user's order. */
  const plans = (): Place[] =>
    [...planIds()].map((id) => recordOf({ level: 'country', id })).sort(byPosition);

  /** The Regions, Islands and Cities of a Country marked Wish, in the user's order: its Itinerary. */
  const itinerary = (countryId: string): Place[] =>
    [...places.values()]
      .filter((record) => record.mark === 'wish' && record.level !== 'country' && countryOf(record) === countryId)
      .sort(byPosition);

  return {
    mark,
    /**
     * Marks a Place Wish, a Place picked to visit, unless it has a Mark of its own: a Place
     * Visited stays Visited. Returns the Mark it had, null when it is newly marked Wish.
     */
    wish(place: PlaceRef | City): Mark | null {
      const had = recordOf(place).mark;
      if (had === null) mark(place, 'wish');
      return had;
    },
    /**
     * Clears a Country, an Island or a Region: its Mark, Note, Todos and Photos go, their files
     * too, and it is Unexplored again. The Places inside it are untouched. Not undoable.
     */
    clear(place: PlaceRef) {
      if (place.level === 'city') throw new Error('A City is Deleted, not Cleared');
      const countryId = atlas.countryOf(place);
      let taken: string[] = [];
      transaction(db, () => {
        taken = takeContent(place);
        // A Country's own position is its place among the Plans, seen to below; a Region's or an
        // Island's is in an Itinerary, which it leaves with its Mark. A Cover photo chosen inside
        // it stays chosen: that Photo is not taken.
        const record = recordOf(place);
        const position = place.level === 'country' ? record.position : null;
        save({ ...record, mark: null, visitDate: null, note: '', position });
        dropPlanIfNoLongerOne(countryId);
      });
      forgetUndo(place);
      files.remove(taken);
    },
    /**
     * Deletes a City of the Journal, a Custom City or one of the list, with its Note, Todos and
     * Photos and their files. Its Region and Country keep their own. Not undoable.
     */
    deleteCity(id: string) {
      const city = cities.get(id);
      if (!city) throw new Error(`No City ${id} in the Journal`);
      let taken: string[] = [];
      transaction(db, () => {
        taken = takeContent(city);
        db.run('DELETE FROM places WHERE level = ? AND id = ?', ['city', id]);
        places.delete(keyOf(city));
        leave(city);
        dropPlanIfNoLongerOne(city.countryId);
      });
      forgetUndo(city);
      files.remove(taken);
    },
    /** Takes back the last change of Mark. Returns its Place, or null when there is none. */
    undo(): PlaceRef | null {
      if (!undoable) return null;
      const { place, mark, visitDate, position, entered, country } = undoable;
      undoable = null;
      transaction(db, () => {
        // Only the Mark goes back, with what it took along: content written since stays, and
        // keeps a City it entered.
        // A Country's own position is its place among the Plans, given back below.
        const record = recordOf(place);
        save({ ...record, mark, visitDate, position: place.level === 'country' ? record.position : position });
        if (country) {
          // Only what the change left as it was: a Planned date set or Plans reordered since stay.
          const ref = { level: 'country', id: country.id } as const;
          const current = recordOf(ref);
          save({
            ...current,
            plannedDate: current.plannedDate === country.after.plannedDate ? country.before.plannedDate : current.plannedDate,
            position: current.position === country.after.position ? country.before.position : current.position,
          });
        }
        if (entered && !places.has(keyOf(place))) leave(place);
      });
      return place;
    },
    /** Sets the Visit date of a Place marked Visited, YYYY-MM: of an earlier visit, say. */
    setVisitDate(place: PlaceRef, visitDate: string) {
      const record = recordOf(place);
      if (record.mark !== 'visited') throw new Error(`${keyOf(place)} is not marked Visited`);
      if (!MONTH.test(visitDate) || visitDate > monthOf(now())) {
        throw new Error(`No Visit date ${visitDate}`);
      }
      save({ ...record, visitDate });
    },
    /** Writes a Place's Note; a City given whole enters the Journal with it, if not there yet. */
    writeNote(place: PlaceRef | City, note: string) {
      transaction(db, () => {
        enter(place);
        save({ ...recordOf(place), note });
      });
    },
    /**
     * Creates a Custom City named `name` at `point`, in the Places the Atlas finds there.
     * Returns it, or null at sea, where nothing is created.
     */
    async createCity(name: string, point: Point): Promise<City | null> {
      const located = await atlas.locate(point);
      if (!located) return null;
      // Unique without a counter to keep: the time, and a random tail for two in the same millisecond.
      const id = `c-${now().getTime().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      const city = customCityAt(id, name, point, located);
      keep(city);
      return city;
    },
    renameCity(id: string, name: string) {
      keep({ ...customCity(id), name });
    },
    /**
     * Moves a Custom City to `point`, into the Places the Atlas finds there. Returns whether
     * it moved: at sea, it stays where it was.
     */
    async moveCity(id: string, point: Point): Promise<boolean> {
      const { name } = customCity(id);
      const located = await atlas.locate(point);
      if (!located) return false;
      keep(customCityAt(id, name, point, located));
      return true;
    },
    /** The Todos of a Place, in the user's order. */
    todos(place: PlaceRef): readonly Todo[] {
      return todos.get(keyOf(place)) ?? [];
    },
    /** Adds an unchecked Todo at the end of the Place's list. */
    addTodo(place: PlaceRef | City, text: string): Todo {
      const list = todos.get(keyOf(place)) ?? [];
      const todo = { id: ++lastTodoId, text, done: false };
      transaction(db, () => {
        enter(place);
        db.run('INSERT INTO todos (id, level, place_id, text, done, position) VALUES (?, ?, ?, ?, 0, ?)', [
          todo.id,
          place.level,
          place.id,
          text,
          list.length,
        ]);
        todos.set(keyOf(place), [...list, todo]);
        save(recordOf(place));
      });
      return todo;
    },
    checkTodo(id: number, done: boolean) {
      const { key, list, index } = findTodo(id);
      db.run('UPDATE todos SET done = ? WHERE id = ?', [done ? 1 : 0, id]);
      todos.set(key, list.map((todo, i) => (i === index ? { ...todo, done } : todo)));
    },
    /** Moves a Todo to `to`, an index in its Place's list; the Todos between shift along. */
    moveTodo(id: number, to: number) {
      const { key, list, index } = findTodo(id);
      const moved = list.filter((_, i) => i !== index);
      moved.splice(Math.max(0, Math.min(to, moved.length)), 0, list[index]);
      transaction(db, () => setOrder(key, moved));
    },
    deleteTodo(id: number) {
      const { key, list, index } = findTodo(id);
      transaction(db, () => {
        db.run('DELETE FROM todos WHERE id = ?', [id]);
        setOrder(key, list.filter((_, i) => i !== index));
        // The last Todo of a Place without a Mark or a Note takes its record with it.
        if (list.length === 1) save(recordOf(placeOf(key)));
      });
    },
    /**
     * Copies images into the app as Photos of a Place, after its own, in the order given; a
     * City given whole enters the Journal with them, if not there yet. Resolves with them.
     */
    async addPhotos(place: PlaceRef | City, sources: readonly string[]): Promise<Photo[]> {
      const copies = [];
      try {
        for (const source of sources) copies.push(await files.copy(source));
      } catch (error) {
        files.remove(copies.flatMap(({ file, thumbnail }) => [file, thumbnail]));
        throw error;
      }
      const ref = { level: place.level, id: place.id };
      const addedAt = now().toISOString();
      const added = copies.map((copy) => ({ id: ++lastPhotoId, place: ref, ...copy, addedAt, caption: '' }));
      transaction(db, () => {
        enter(place);
        for (const photo of added) {
          db.run('INSERT INTO photos (id, level, place_id, file, thumbnail, added_at) VALUES (?, ?, ?, ?, ?, ?)', [
            photo.id,
            ref.level,
            ref.id,
            photo.file,
            photo.thumbnail,
            addedAt,
          ]);
        }
        photos.set(keyOf(ref), [...(photos.get(keyOf(ref)) ?? []), ...added]);
        save(recordOf(ref));
      });
      return added;
    },
    /** The Photos of a Place, its own, in the order they were added. */
    photos(place: PlaceRef): readonly Photo[] {
      return photos.get(keyOf(place)) ?? [];
    },
    /**
     * The Photos of the Places inside a Place, not its own, in the order they were added: a
     * Country's are those of its Regions and of its Cities. A Photo is listed by its Place only.
     */
    photosInside,
    /**
     * The Photo that represents a Place, on the globe and in its sheet (see coverPhoto above);
     * null when neither it nor the Places inside it have Photos.
     */
    coverPhoto,
    /** Chooses a Place's Cover photo, among its own Photos and those of the Places inside it. */
    setCoverPhoto(place: PlaceRef, photoId: number) {
      const own = photos.get(keyOf(place)) ?? [];
      if (![...own, ...photosInside(place)].some((photo) => photo.id === photoId)) {
        throw new Error(`Photo ${photoId} is neither of ${keyOf(place)} nor inside it`);
      }
      save({ ...recordOf(place), coverPhotoId: photoId });
    },
    /** Every Place with Photos of its own or inside it, in no set order: those the globe shows. */
    photographed(): PlaceRef[] {
      const found = new Map<string, PlaceRef>();
      for (const [{ place }] of photos.values()) {
        for (const up of chainOf(place)) found.set(keyOf(up), { level: up.level, id: up.id });
      }
      return [...found.values()];
    },
    /** Sets a Photo's Caption: one line of CAPTION_MAX characters at most, or empty for none. */
    setCaption(id: number, caption: string) {
      if (caption.length > CAPTION_MAX || /[\r\n]/.test(caption)) throw new Error(`No Caption ${JSON.stringify(caption)}`);
      const photo = findPhoto(id);
      db.run('UPDATE photos SET caption = ? WHERE id = ?', [caption, id]);
      const key = keyOf(photo.place);
      photos.set(key, photos.get(key)!.map((p) => (p.id === id ? { ...p, caption } : p)));
    },
    /** Deletes a Photo and its files; the last Photo of a Place without a Mark or content takes its record. */
    deletePhoto(id: number) {
      const photo = findPhoto(id);
      const key = keyOf(photo.place);
      const rest = photos.get(key)!.filter((p) => p.id !== id);
      transaction(db, () => {
        db.run('DELETE FROM photos WHERE id = ?', [id]);
        forgetCovers(new Set([id]));
        if (rest.length > 0) photos.set(key, rest);
        else photos.delete(key);
        save(recordOf(photo.place));
      });
      files.remove([photo.file, photo.thumbnail]);
    },
    /** The Journal's record of a Place, or null when it holds nothing about it. */
    place(place: PlaceRef): Place | null {
      return places.get(keyOf(place)) ?? null;
    },
    status: statusOf,
    /**
     * The Visit dates a Place shows, YYYY-MM: its own, from and to alike, or else the earliest
     * and latest of the Places inside it. Null when none of them has one.
     */
    visitDates(place: PlaceRef): VisitDates | null {
      const own = recordOf(place).visitDate;
      if (own) return { from: own, to: own };
      const key = keyOf(place);
      const dates = [...places.values()]
        .filter((p) => p.visitDate !== null && chainOf(p).slice(1).some((up) => keyOf(up) === key))
        .map((p) => p.visitDate!)
        .sort();
      return dates.length > 0 ? { from: dates[0], to: dates[dates.length - 1] } : null;
    },
    /**
     * The Journal view's list: every Place with a Mark or content (an Unexplored one with a
     * Note, say), grouped by the Country it belongs to, Islands included; in no set order.
     */
    byCountry(): CountryGroup[] {
      const groups = new Map<string, PlaceRef[]>();
      for (const record of places.values()) {
        if (record.mark === null && !hasContent(record)) continue;
        const countryId = countryOf(record);
        if (countryId === undefined) continue;
        groups.set(countryId, [...(groups.get(countryId) ?? []), { level: record.level, id: record.id }]);
      }
      return [...groups].map(([countryId, list]) => ({ countryId, places: list }));
    },
    countryOf,
    /**
     * A Country's page: its Regions and its Islands with a Mark or content, or holding a City
     * with one, each with those Cities; and its other such Cities, in no Region nor Island.
     * The Country itself is not listed. All in no set order.
     */
    countryPage(countryId: string): CountryPage {
      const regions = new Map<string, PlaceRef[]>();
      const islands = new Map<string, PlaceRef[]>();
      const otherCities: PlaceRef[] = [];
      const add = (groups: Map<string, PlaceRef[]>, id: string, city?: PlaceRef) => {
        const list = groups.get(id) ?? [];
        groups.set(id, city ? [...list, city] : list);
      };
      for (const record of places.values()) {
        if (record.mark === null && !hasContent(record)) continue;
        if (countryOf(record) !== countryId) continue;
        if (record.level === 'region') add(regions, record.id);
        else if (record.level === 'island') add(islands, record.id);
        else if (record.level === 'city') {
          const city = cities.get(record.id)!;
          const ref = { level: 'city', id: city.id } as const;
          if (city.islandId) add(islands, city.islandId, ref);
          else if (city.regionId) add(regions, city.regionId, ref);
          else otherCities.push(ref);
        }
      }
      const listOf = (level: 'region' | 'island', groups: Map<string, PlaceRef[]>) =>
        [...groups].map(([id, list]) => ({ place: { level, id }, cities: list }));
      return { regions: listOf('region', regions), islands: listOf('island', islands), otherCities };
    },
    /**
     * The Plans: every Country holding a Place marked Wish, itself or one inside it, in the
     * user's order; a Country newly a Plan comes last.
     */
    plans(): Plan[] {
      return plans().map(({ id, plannedDate }) => ({ countryId: id, plannedDate }));
    },
    /**
     * Reorders some Plans among themselves: they take, in the order given, the places they held
     * among the others. Those of one group of the Wishlist, say.
     */
    orderPlans(countryIds: readonly string[]) {
      if (new Set(countryIds).size !== countryIds.length) throw new Error('A Plan given twice');
      const all = plans();
      const given = countryIds.map((id) => {
        const plan = all.find((p) => p.id === id);
        if (!plan) throw new Error(`Country ${id} is no Plan`);
        return plan;
      });
      const slots = all.flatMap((plan, i) => (countryIds.includes(plan.id) ? [i] : []));
      slots.forEach((slot, i) => (all[slot] = given[i]));
      transaction(db, () => all.forEach((plan, position) => save({ ...plan, position })));
    },
    /** Sets the Planned date of a Plan, YYYY-MM, or takes it off with null (« Un jour »). */
    setPlannedDate(countryId: string, plannedDate: string | null) {
      if (!planIds().has(countryId)) throw new Error(`Country ${countryId} is no Plan`);
      if (plannedDate !== null && !MONTH.test(plannedDate)) throw new Error(`No Planned date ${plannedDate}`);
      save({ ...recordOf({ level: 'country', id: countryId }), plannedDate });
    },
    /**
     * A Plan's Itinerary: its Regions, Islands and Cities marked Wish, the Country aside, in the
     * user's order; a Place newly marked Wish comes last.
     */
    itinerary(countryId: string): PlaceRef[] {
      return itinerary(countryId).map(({ level, id }) => ({ level, id }));
    },
    /** Moves a stop to `to`, an index in its Itinerary; the stops between shift along. */
    moveStop(place: PlaceRef, to: number) {
      const countryId = countryOf(place);
      const list = countryId === undefined ? [] : itinerary(countryId);
      const from = list.findIndex((stop) => keyOf(stop) === keyOf(place));
      if (from < 0) throw new Error(`${keyOf(place)} is in no Itinerary`);
      const moved = list.filter((_, i) => i !== from);
      moved.splice(Math.max(0, Math.min(to, moved.length)), 0, list[from]);
      transaction(db, () => moved.forEach((stop, position) => save({ ...stop, position })));
    },
    /** Every Place whose own Mark is Wish, whatever its level: those of the Plans; in no set order. */
    wishlist(): PlaceRef[] {
      return [...places.values()].filter((record) => record.mark === 'wish').map(({ level, id }) => ({ level, id }));
    },
    /** Every City in the Journal. */
    cities(): City[] {
      return [...cities.values()];
    },
    /** A City in the Journal, or null when it is not there. */
    city(id: string): City | null {
      return cities.get(id) ?? null;
    },
    /** The Cities in the Journal inside a Place, by name: a Country's include those of its Regions. */
    citiesIn(place: PlaceRef): City[] {
      const key = keyOf(place);
      return [...cities.values()]
        .filter((city) => chainOf(city).slice(1).some((up) => keyOf(up) === key))
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    },
    /**
     * Where an inherited Status comes from: the Places inside that have it, in no set
     * order. Empty when the Place's own Mark makes its Status.
     */
    via(place: PlaceRef): PlaceRef[] {
      const status = statusOf(place);
      if (status === 'unexplored' || recordOf(place).mark === status) return [];
      return inside(place)
        .filter((child) => statusOf(child) === status)
        .map(({ level, id }) => ({ level, id }));
    },
    /** Whether « Retirer » is offered: only on a Mark that makes the Place's Status. */
    canRemoveMark(place: PlaceRef): boolean {
      const { mark } = recordOf(place);
      return mark !== null && mark === statusOf(place);
    },
    /** How many Places of the Atlas (Countries and Islands) have each Status, for the filter chips. */
    counts(): Record<Status, number> {
      const counts = { visited: 0, wish: 0, unexplored: 0 };
      for (const place of atlas.places) counts[statusOf(place)]++;
      return counts;
    },
    /**
     * How many Places have the Status Visited, for the Profile: Countries; Regions, Islands
     * among them; and Cities. Visited outranks all, so a Place is Visited when it is marked so
     * or holds a Place marked so: every Place up from a Visited Mark is, and no other.
     */
    visitedCounts(): VisitedCounts {
      const visited = new Set<string>();
      const counts = { countries: 0, regions: 0, cities: 0 };
      for (const record of places.values()) {
        if (record.mark !== 'visited') continue;
        for (const up of chainOf(record)) {
          const key = keyOf(up);
          if (visited.has(key)) continue;
          visited.add(key);
          if (up.level === 'country') counts.countries++;
          else if (up.level === 'city') counts.cities++;
          else counts.regions++;
        }
      }
      return counts;
    },
  };
}

export type Journal = ReturnType<typeof openJournal>;
