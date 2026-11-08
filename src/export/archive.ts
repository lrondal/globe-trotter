// « Exporter mes voyages », its Import, and « Réinitialiser toutes les données ».
//
// An Export is one zip file: `voyages.json`, a versioned JSON of the Journal (Places, Cities,
// Todos, Photos) and of the Preferences, and a `photos/` folder holding the Photos' files under
// the names the Journal keeps. The user's position is never in it: the Journal never knows it.
//
// An Import replaces everything. The whole archive is checked before anything is written: its
// JSON, every link between its records, and the bytes of every Photo file. A file that fails is
// refused with an InvalidExport, the user's data untouched.
import { CAPTION_MAX, EMPTY_JOURNAL, type City, type Journal, type JournalData, type Mark, type Photo, type Place, type PlaceRef, type PlacedTodo } from '../journal/journal.ts';
import type { PhotoFiles } from '../journal/photoFiles.ts';
import { DEFAULT_PREFERENCES, type Preferences } from '../profile/preferences.ts';
import type { ByteSink, ByteSource } from './bytes.ts';
import { readZip, ZipError, zipWriter, type Zip } from './zip.ts';

/** The version of the JSON this app writes; an Export of a later one is refused. */
export const EXPORT_VERSION = 1;
const APP = 'globe-trotter';
const JSON_NAME = 'voyages.json';
const PHOTOS_FOLDER = 'photos/';

/** A file the Import refuses; its message, in French, says why to the user. */
export class InvalidExport extends Error {}

const NOT_AN_EXPORT = 'Ce fichier n’est pas un Export de Globe trotter.';
const TOO_NEW = 'Cet Export vient d’une version plus récente de Globe trotter : mettez l’app à jour pour l’importer.';
const DAMAGED = 'Cet Export est abîmé ou incomplet : il ne peut pas être importé.';

/** The JSON of an Export. */
type ExportJson = {
  app: typeof APP;
  version: number;
  /** When it was made, an ISO date-time. */
  exportedAt: string;
  preferences: Preferences;
  journal: JournalData;
};

type Deps = { journal: Journal; files: PhotoFiles };

/** Writes an Export of everything to `sink`: the JSON first, then each Photo's files. */
export async function writeExport(
  { journal, files, preferences, now = () => new Date() }: Deps & { preferences: Preferences; now?: () => Date },
  sink: ByteSink,
) {
  const data = journal.snapshot();
  const json: ExportJson = { app: APP, version: EXPORT_VERSION, exportedAt: now().toISOString(), preferences, journal: data };
  const zip = zipWriter(sink);
  await zip.add(JSON_NAME, new TextEncoder().encode(JSON.stringify(json)));
  for (const name of photoFileNames(data)) await zip.add(PHOTOS_FOLDER + name, await files.read(name));
  await zip.finish();
}

/** The names of the files of an Export's Photos, copies and thumbnails. */
const photoFileNames = (data: JournalData) => data.photos.flatMap(({ file, thumbnail }) => [file, thumbnail]);

/** An Export read and checked whole, ready to apply. */
export type ExportContents = {
  exportedAt: string;
  preferences: Preferences;
  journal: JournalData;
  zip: Zip;
};

/**
 * Reads an Export and checks it whole, Photos' bytes included, writing nothing. Rejects with
 * an InvalidExport saying what is wrong.
 */
export async function readExport(source: ByteSource): Promise<ExportContents> {
  let zip: Zip;
  let raw: unknown;
  try {
    zip = await readZip(source);
    raw = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await zip.read(JSON_NAME)));
  } catch (error) {
    if (error instanceof ZipError || error instanceof SyntaxError || error instanceof TypeError) {
      throw new InvalidExport(NOT_AN_EXPORT);
    }
    throw error;
  }
  if (!isObject(raw) || raw.app !== APP || !isCount(raw.version)) throw new InvalidExport(NOT_AN_EXPORT);
  if (raw.version > EXPORT_VERSION) throw new InvalidExport(TOO_NEW);
  let contents: Omit<ExportContents, 'zip'>;
  try {
    contents = {
      exportedAt: string(raw.exportedAt),
      preferences: preferencesOf(raw.preferences),
      journal: journalOf(raw.journal),
    };
    for (const name of photoFileNames(contents.journal)) await zip.read(PHOTOS_FOLDER + name);
  } catch (error) {
    if (error instanceof Malformed || error instanceof ZipError) throw new InvalidExport(DAMAGED);
    throw error;
  }
  return { ...contents, zip };
}

/**
 * Replaces everything the app holds with an Export read by readExport: its Photos' files are
 * written, then the Journal replaced, then the files no longer of any Photo removed. Should a
 * file fail to be written, the Journal is left as it was. The Preferences are the caller's to
 * set, from `contents.preferences`.
 */
export async function applyExport(contents: ExportContents, { journal, files }: Deps) {
  const before = new Set(files.list());
  const names = photoFileNames(contents.journal);
  const written: string[] = [];
  try {
    for (const name of names) {
      await files.write(name, await contents.zip.read(PHOTOS_FOLDER + name));
      written.push(name);
    }
    journal.restore(contents.journal);
  } catch (error) {
    files.remove(written.filter((name) => !before.has(name)));
    throw error;
  }
  const kept = new Set(names);
  files.remove([...before].filter((name) => !kept.has(name)));
}

/**
 * « Réinitialiser toutes les données »: the Journal emptied and every Photo file removed, for
 * good, as at first installation. The Preferences are the caller's to set back to theirs.
 */
export function resetAll({ journal, files }: Deps) {
  journal.restore(EMPTY_JOURNAL);
  files.remove(files.list());
}

// Checking the JSON: each reader returns the value typed, or throws Malformed.

class Malformed extends Error {}

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);
const isCount = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0;

function check(ok: boolean, what: string): asserts ok {
  if (!ok) throw new Malformed(what);
}
const object = (value: unknown): Json => {
  check(isObject(value), 'an object');
  return value;
};
const array = (value: unknown): unknown[] => {
  check(Array.isArray(value), 'an array');
  return value;
};
const string = (value: unknown): string => {
  check(typeof value === 'string', 'a string');
  return value;
};
const id = (value: unknown): string => {
  check(typeof value === 'string' && value !== '', 'an id');
  return value;
};
const count = (value: unknown): number => {
  check(isCount(value), 'a count');
  return value;
};
/** An optional field: `fallback` when absent or null, as an older Export may leave it. */
const optional = <T>(value: unknown, read: (value: unknown) => T, fallback: T): T =>
  value === undefined || value === null ? fallback : read(value);
const finite = (value: unknown, limit: number): number => {
  check(typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit, 'a coordinate');
  return value;
};

/** A month, YYYY-MM. */
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const month = (value: unknown): string => {
  check(typeof value === 'string' && MONTH.test(value), 'a month');
  return value;
};
const LEVELS: readonly PlaceRef['level'][] = ['country', 'island', 'region', 'city'];
const MARKS: readonly Mark[] = ['visited', 'wish'];
/** A file name of the Photos: no folder, nothing to climb out of the Photos' own. */
const FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const fileName = (value: unknown): string => {
  check(typeof value === 'string' && FILE_NAME.test(value) && !value.includes('..'), 'a file name');
  return value;
};

const placeRef = (value: unknown): PlaceRef => {
  const o = object(value);
  check(LEVELS.includes(o.level as PlaceRef['level']), 'a level');
  return { level: o.level as PlaceRef['level'], id: id(o.id) };
};
const keyOf = (place: PlaceRef) => `${place.level}:${place.id}`;

function preferencesOf(value: unknown): Preferences {
  const o = optional(value, object, {});
  const read = { ...DEFAULT_PREFERENCES };
  for (const key of Object.keys(read) as (keyof Preferences)[]) {
    if (o[key] === undefined) continue;
    check(typeof o[key] === 'boolean', 'a setting');
    read[key] = o[key];
  }
  return read;
}

function journalOf(value: unknown): JournalData {
  const o = object(value);
  const places = array(o.places).map((value): Place => {
    const p = object(value);
    const mark = optional(p.mark, (m) => (check(MARKS.includes(m as Mark), 'a Mark'), m as Mark), null);
    return {
      ...placeRef(p),
      mark,
      visitDate: optional(p.visitDate, month, null),
      note: optional(p.note, string, ''),
      coverPhotoId: optional(p.coverPhotoId, count, null),
      plannedDate: optional(p.plannedDate, month, null),
      position: optional(p.position, count, null),
    };
  });
  const cities = array(o.cities).map((value): City => {
    const c = object(value);
    check(c.custom === undefined || c.custom === true, 'custom');
    return {
      level: 'city',
      id: id(c.id),
      name: string(c.name),
      lon: finite(c.lon, 180),
      lat: finite(c.lat, 90),
      countryId: id(c.countryId),
      ...(c.islandId === undefined ? {} : { islandId: id(c.islandId) }),
      ...(c.regionId === undefined ? {} : { regionId: id(c.regionId) }),
      ...(c.custom ? { custom: true } : {}),
    };
  });
  const todos = array(o.todos).map((value): PlacedTodo => {
    const t = object(value);
    check(typeof t.done === 'boolean', 'done');
    return { id: count(t.id), place: placeRef(t.place), text: string(t.text), done: t.done };
  });
  const photos = array(o.photos).map((value): Photo => {
    const p = object(value);
    const caption = optional(p.caption, string, '');
    check(caption.length <= CAPTION_MAX && !/[\r\n]/.test(caption), 'a Caption');
    return {
      id: count(p.id),
      place: placeRef(p.place),
      file: fileName(p.file),
      thumbnail: fileName(p.thumbnail),
      addedAt: string(p.addedAt),
      caption,
    };
  });

  // Links between records, as the Journal keeps them: each Place, City, Todo and Photo once; a
  // City recorded as a Place is in the Journal's Cities; a Todo's or Photo's Place is recorded.
  const placeKeys = new Set(places.map(keyOf));
  const cityIds = new Set(cities.map((city) => city.id));
  check(placeKeys.size === places.length && cityIds.size === cities.length, 'each once');
  check(new Set(todos.map((todo) => todo.id)).size === todos.length, 'each Todo once');
  check(new Set(photos.map((photo) => photo.id)).size === photos.length, 'each Photo once');
  const files = photos.flatMap(({ file, thumbnail }) => [file, thumbnail]);
  check(new Set(files).size === files.length, 'each file once');
  check(places.every((place) => place.level !== 'city' || cityIds.has(place.id)), 'Cities');
  check([...todos, ...photos].every(({ place }) => placeKeys.has(keyOf(place))), 'owners');
  const lastPhotoId = optional(o.lastPhotoId, count, 0);
  check(photos.every((photo) => photo.id > 0 && photo.id <= lastPhotoId), 'Photo ids');
  check(todos.every((todo) => todo.id > 0), 'Todo ids');

  return { places, cities, todos, photos, lastPhotoId };
}
