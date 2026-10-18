// The Journal: the user's Places and the rules over them. The only module that writes.
// Every write goes through to the injected SQLite database at once; reads come from a copy
// held in memory, loaded when the Journal opens, so the globe can ask for every Country's
// Status on each change without a query per Country.
import type { Database } from './database.ts';

export type Mark = 'visited' | 'wish';
export type Status = Mark | 'unexplored';
export type PlaceRef = { level: 'country'; id: string };

type Options = {
  db: Database;
  /** The reference Places the Journal counts over. */
  atlas: { countries: readonly { id: string }[] };
  now?: () => Date;
};

/** A Place as the Journal records it. A Country has a record only while it has a Mark or content. */
export type Place = PlaceRef & {
  mark: Mark | null;
  /** Month-precision, YYYY-MM. Only a Visited Place has one. */
  visitDate: string | null;
  /** The Place's Note; empty when it has none. */
  note: string;
};

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
];

function migrate(db: Database) {
  const [{ user_version: done }] = db.all<{ user_version: number }>('PRAGMA user_version');
  if (done >= MIGRATIONS.length) return;
  db.exec('BEGIN');
  try {
    for (const migration of MIGRATIONS.slice(done)) db.exec(migration);
    db.exec(`PRAGMA user_version = ${MIGRATIONS.length}`);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

type Row = { id: string; level: 'country'; mark: Mark | null; visit_date: string | null; note: string };

const toPlace = (row: Row): Place => ({
  level: row.level,
  id: row.id,
  mark: row.mark,
  visitDate: row.visit_date,
  note: row.note,
});

/** The month of `date`, in local time, as YYYY-MM. */
const monthOf = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const hasContent = (place: Place) => place.note !== '';

const keyOf = (place: PlaceRef) => `${place.level}:${place.id}`;

export function openJournal({ db, atlas, now = () => new Date() }: Options) {
  migrate(db);
  const places = new Map(
    db.all<Row>('SELECT id, level, mark, visit_date, note FROM places').map((row) => [keyOf(row), toPlace(row)]),
  );

  /** The Journal's record of `place`, or a blank one when it has none. */
  const recordOf = (place: PlaceRef): Place =>
    places.get(keyOf(place)) ?? { level: place.level, id: place.id, mark: null, visitDate: null, note: '' };
  /** Records `place`, or forgets it once it holds nothing. */
  const save = (place: Place) => {
    if (place.mark === null && !hasContent(place)) {
      db.run('DELETE FROM places WHERE level = ? AND id = ?', [place.level, place.id]);
      places.delete(keyOf(place));
      return;
    }
    db.run('INSERT OR REPLACE INTO places (level, id, mark, visit_date, note) VALUES (?, ?, ?, ?, ?)', [
      place.level,
      place.id,
      place.mark,
      place.visitDate,
      place.note,
    ]);
    places.set(keyOf(place), place);
  };

  /** The last change of Mark: the Place, and its Mark and Visit date before the change. */
  let undoable: { place: PlaceRef; mark: Mark | null; visitDate: string | null } | null = null;

  return {
    mark(place: PlaceRef, mark: Mark | null) {
      const before = recordOf(place);
      // The Visit date belongs to the visit: marking Visited dates it, leaving Visited drops it.
      const visitDate = mark === 'visited' ? (before.visitDate ?? monthOf(now())) : null;
      save({ ...before, mark, visitDate });
      undoable = { place: { level: place.level, id: place.id }, mark: before.mark, visitDate: before.visitDate };
    },
    /** Takes back the last change of Mark. Returns its Place, or null when there is none. */
    undo(): PlaceRef | null {
      if (!undoable) return null;
      const { place, mark, visitDate } = undoable;
      undoable = null;
      // Only the Mark goes back: content written since stays.
      save({ ...recordOf(place), mark, visitDate });
      return place;
    },
    writeNote(place: PlaceRef, note: string) {
      save({ ...recordOf(place), note });
    },
    /** The Journal's record of a Place, or null when it holds nothing about it. */
    place(place: PlaceRef): Place | null {
      return places.get(keyOf(place)) ?? null;
    },
    status(place: PlaceRef): Status {
      return recordOf(place).mark ?? 'unexplored';
    },
    /** How many Countries of the Atlas have each Status, for the filter chips. */
    counts(): Record<Status, number> {
      const counts = { visited: 0, wish: 0, unexplored: 0 };
      for (const { id } of atlas.countries) counts[recordOf({ level: 'country', id }).mark ?? 'unexplored']++;
      return counts;
    },
  };
}

export type Journal = ReturnType<typeof openJournal>;
