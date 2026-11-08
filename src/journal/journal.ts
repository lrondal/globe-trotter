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
};

/** The Places of the Journal view belonging to one Country, by its id. */
export type CountryGroup = { countryId: string; places: PlaceRef[] };

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
];

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
});

const keyOf = (place: PlaceRef) => `${place.level}:${place.id}`;

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
    db.all<Row>('SELECT id, level, mark, visit_date, note, cover_photo_id FROM places').map((row) => [keyOf(row), toPlace(row)]),
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
    places.get(keyOf(place)) ?? { level: place.level, id: place.id, mark: null, visitDate: null, note: '', coverPhotoId: null };
  const hasContent = (place: Place) => place.note !== '' || todos.has(keyOf(place)) || photos.has(keyOf(place));
  /** Records `place`, or forgets it once it holds nothing: not even a choice of Cover photo. */
  const save = (place: Place) => {
    if (place.mark === null && place.coverPhotoId === null && !hasContent(place)) {
      db.run('DELETE FROM places WHERE level = ? AND id = ?', [place.level, place.id]);
      places.delete(keyOf(place));
      return;
    }
    db.run(
      'INSERT OR REPLACE INTO places (level, id, mark, visit_date, note, cover_photo_id) VALUES (?, ?, ?, ?, ?, ?)',
      [place.level, place.id, place.mark, place.visitDate, place.note, place.coverPhotoId],
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
   * The last change of Mark: the Place, its Mark and Visit date before the change, and
   * whether the change put it in the Journal, a City of the list.
   */
  let undoable: { place: PlaceRef; mark: Mark | null; visitDate: string | null; entered: boolean } | null = null;

  return {
    /** Sets a Place's Mark; a City given whole enters the Journal with it, if not there yet. */
    mark(place: PlaceRef | City, mark: Mark | null) {
      const before = recordOf(place);
      // The Visit date belongs to the visit: marking Visited dates it, leaving Visited drops it.
      const visitDate = mark === 'visited' ? (before.visitDate ?? monthOf(now())) : null;
      let entered = false;
      transaction(db, () => {
        entered = enter(place);
        save({ ...before, mark, visitDate });
      });
      undoable = { place: { level: place.level, id: place.id }, mark: before.mark, visitDate: before.visitDate, entered };
    },
    /** Takes back the last change of Mark. Returns its Place, or null when there is none. */
    undo(): PlaceRef | null {
      if (!undoable) return null;
      const { place, mark, visitDate, entered } = undoable;
      undoable = null;
      transaction(db, () => {
        // Only the Mark goes back: content written since stays, and keeps a City it entered.
        save({ ...recordOf(place), mark, visitDate });
        if (entered && !places.has(keyOf(place))) leave(place);
      });
      return place;
    },
    /** Sets the Visit date of a Place marked Visited, YYYY-MM: of an earlier visit, say. */
    setVisitDate(place: PlaceRef, visitDate: string) {
      const record = recordOf(place);
      if (record.mark !== 'visited') throw new Error(`${keyOf(place)} is not marked Visited`);
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(visitDate) || visitDate > monthOf(now())) {
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
        // Its id may be given to a Photo added later: no Place keeps it as its Cover photo.
        for (const record of [...places.values()]) {
          if (record.coverPhotoId === id) save({ ...record, coverPhotoId: null });
        }
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
    /** The Wishlist: every Place whose own Mark is Wish, whatever its level; in no set order. */
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
  };
}

export type Journal = ReturnType<typeof openJournal>;
