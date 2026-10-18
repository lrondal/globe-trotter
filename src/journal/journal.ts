// The Journal: the user's Places and the rules over them. The only module that writes.
// Every write goes through to the injected SQLite database at once; reads come from a copy
// held in memory, loaded when the Journal opens, so the globe can ask for every Country's
// Status on each change without a query per Country.
import type { Database } from './database.ts';

export type Mark = 'visited' | 'wish';
export type Status = Mark | 'unexplored';
/** An Island is marked independently of its Country: neither one's Status reaches the other. */
export type PlaceRef = { level: 'country' | 'island' | 'region'; id: string };

type Options = {
  db: Database;
  atlas: {
    /** The reference Places the Journal counts over. */
    places: readonly PlaceRef[];
    /** The Place a Place is inside, whose Status it reaches: a Region's Country. */
    containerOf(place: PlaceRef): PlaceRef | null;
  };
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

/** A checklist item of a Place. */
export type Todo = { id: number; text: string; done: boolean };

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

type Row = { id: string; level: PlaceRef['level']; mark: Mark | null; visit_date: string | null; note: string };

type TodoRow = { id: number; level: PlaceRef['level']; place_id: string; text: string; done: number };

const toPlace = (row: Row): Place => ({
  level: row.level,
  id: row.id,
  mark: row.mark,
  visitDate: row.visit_date,
  note: row.note,
});

/** The month of `date`, in local time, as YYYY-MM. */
const monthOf = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const keyOf = (place: PlaceRef) => `${place.level}:${place.id}`;

/** Visited outranks Wish, which outranks Unexplored. */
const RANK: Record<Status, number> = { unexplored: 0, wish: 1, visited: 2 };
/** The Place of a key from keyOf: levels never hold a colon. */
const placeOf = (key: string): PlaceRef => {
  const colon = key.indexOf(':');
  return { level: key.slice(0, colon) as PlaceRef['level'], id: key.slice(colon + 1) };
};

export function openJournal({ db, atlas, now = () => new Date() }: Options) {
  migrate(db);
  const places = new Map(
    db.all<Row>('SELECT id, level, mark, visit_date, note FROM places').map((row) => [keyOf(row), toPlace(row)]),
  );
  /** The Todos of each Place that has some, in order. */
  const todos = new Map<string, Todo[]>();
  for (const row of db.all<TodoRow>('SELECT id, level, place_id, text, done FROM todos ORDER BY position')) {
    const key = keyOf({ level: row.level, id: row.place_id });
    todos.set(key, [...(todos.get(key) ?? []), { id: row.id, text: row.text, done: row.done === 1 }]);
  }
  let lastTodoId = Math.max(0, ...[...todos.values()].flat().map((todo) => todo.id));
  /** The list holding the Todo `id`, under its Place's key, and the Todo's index in it. */
  const findTodo = (id: number) => {
    for (const [key, list] of todos) {
      const index = list.findIndex((todo) => todo.id === id);
      if (index >= 0) return { key, list, index };
    }
    throw new Error(`No Todo ${id}`);
  };
  /** Records `list` as the Todos of the Place `key`, in order: positions run 0, 1, 2… */
  const setOrder = (key: string, list: Todo[]) => {
    list.forEach((todo, position) => db.run('UPDATE todos SET position = ? WHERE id = ?', [position, todo.id]));
    if (list.length > 0) todos.set(key, list);
    else todos.delete(key);
  };

  /** The Journal's record of `place`, or a blank one when it has none. */
  const recordOf = (place: PlaceRef): Place =>
    places.get(keyOf(place)) ?? { level: place.level, id: place.id, mark: null, visitDate: null, note: '' };
  const hasContent = (place: Place) => place.note !== '' || todos.has(keyOf(place));
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

  /** The Places inside `place` that the Journal holds something about. */
  const inside = (place: PlaceRef): PlaceRef[] => {
    const key = keyOf(place);
    return [...places.values()].filter((p) => {
      const container = atlas.containerOf(p);
      return container !== null && keyOf(container) === key;
    });
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
    /** The Todos of a Place, in the user's order. */
    todos(place: PlaceRef): readonly Todo[] {
      return todos.get(keyOf(place)) ?? [];
    },
    /** Adds an unchecked Todo at the end of the Place's list. */
    addTodo(place: PlaceRef, text: string): Todo {
      const list = todos.get(keyOf(place)) ?? [];
      const todo = { id: ++lastTodoId, text, done: false };
      transaction(db, () => {
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
    /** The Journal's record of a Place, or null when it holds nothing about it. */
    place(place: PlaceRef): Place | null {
      return places.get(keyOf(place)) ?? null;
    },
    status: statusOf,
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
