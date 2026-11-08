/// <reference types="node" />
// Export, Import and « Réinitialiser toutes les données », through the Journal.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { openJournal, type PlaceRef } from '../journal/journal.ts';
import { memoryDatabase } from '../journal/memoryDatabase.ts';
import { memoryPhotoFiles } from '../journal/memoryPhotoFiles.ts';
import { applyExport, InvalidExport, readExport, resetAll, writeExport } from './archive.ts';
import { memoryBytes } from './memoryBytes.ts';
import { readZip, zipWriter } from './zip.ts';

const REGIONS: Record<string, string> = { kansai: '392' };
const atlas = {
  places: ['250', '392'].map((id) => ({ level: 'country', id }) as const),
  containerOf: (place: PlaceRef): PlaceRef | null =>
    place.level === 'region' ? { level: 'country', id: REGIONS[place.id] } : null,
  locate: async ({ lon }: { lon: number; lat: number }) => (lon >= 130 ? { countryId: '392', regionId: 'kansai' } : null),
  countryOf: (place: PlaceRef): string =>
    place.level === 'region' ? REGIONS[place.id] : place.id === 'i-okinawa' ? '392' : place.id,
};
const france = { level: 'country', id: '250' } as const;
const japan = { level: 'country', id: '392' } as const;
const kansai = { level: 'region', id: 'kansai' } as const;
const okinawa = { level: 'island', id: 'i-okinawa' } as const;
const kyoto = { level: 'city', id: '1857910', name: 'Kyoto', lon: 135.75, lat: 35.01, countryId: '392', regionId: 'kansai' } as const;
const now = () => new Date(2026, 10, 8);

function phone() {
  const db = memoryDatabase();
  const files = memoryPhotoFiles();
  return { db, files, journal: openJournal({ db, atlas, files, now }) };
}

/** A phone holding a bit of everything a Journal keeps. */
async function travelled() {
  const p = phone();
  const j = p.journal;
  j.mark(france, 'visited');
  j.setVisitDate(france, '2019-07');
  j.writeNote(france, 'Bretagne en août.\nCrêpes.');
  j.mark(okinawa, 'wish');
  j.mark(kyoto, 'wish');
  j.mark(kansai, 'wish');
  j.moveStop(kansai, 0);
  j.setPlannedDate('392', '2027-04');
  const osaka = await j.createCity('Osaka', { lon: 135.5, lat: 34.7 });
  j.addTodo(kyoto, 'Fushimi Inari à l’aube');
  const done = j.addTodo(kyoto, 'Réserver le ryokan');
  j.addTodo(kyoto, 'Philosophe');
  j.checkTodo(done.id, true);
  j.moveTodo(done.id, 0);
  const [first, second] = await j.addPhotos(kyoto, ['file:///camera/torii.heic', 'file:///camera/temple.heic']);
  await j.addPhotos(osaka!, ['file:///camera/castle.heic']);
  j.setCaption(second.id, 'Kiyomizu-dera');
  j.setCoverPhoto(japan, second.id);
  j.deletePhoto(first.id);
  return p;
}

const PREFERENCES = { photosOnGlobe: false, autoRotate: true };

async function exported(from: Awaited<ReturnType<typeof travelled>>) {
  const bytes = memoryBytes();
  await writeExport({ journal: from.journal, files: from.files, preferences: PREFERENCES, now }, bytes.sink);
  return bytes;
}

/** The files a phone holds, with their bytes, by name. */
const filesOf = async (files: ReturnType<typeof memoryPhotoFiles>) =>
  Object.fromEntries(await Promise.all(files.list().sort().map(async (name) => [name, await files.read(name)])));

test('an Export imported on another phone gives back its Journal, Photos and Preferences as they were', async () => {
  const from = await travelled();
  const bytes = await exported(from);

  const to = phone();
  // Whatever it held is replaced.
  to.journal.mark(japan, 'visited');
  await to.journal.addPhotos(japan, ['file:///camera/old.heic']);
  const contents = await readExport(bytes.source());
  await applyExport(contents, { journal: to.journal, files: to.files });

  assert.deepEqual(to.journal.snapshot(), from.journal.snapshot());
  assert.deepEqual(await filesOf(to.files), await filesOf(from.files));
  assert.deepEqual(contents.preferences, PREFERENCES);
  // As the screens read it, not only as the snapshot has it.
  assert.equal(to.journal.status(france), 'visited');
  assert.equal(to.journal.place(france)?.visitDate, '2019-07');
  assert.deepEqual(to.journal.plans(), [{ countryId: '392', plannedDate: '2027-04' }]);
  assert.deepEqual(to.journal.itinerary('392').map((p) => p.id), ['kansai', 'i-okinawa', '1857910']);
  assert.deepEqual(to.journal.todos(kyoto).map((t) => [t.text, t.done]), [
    ['Réserver le ryokan', true],
    ['Fushimi Inari à l’aube', false],
    ['Philosophe', false],
  ]);
  assert.equal(to.journal.coverPhoto(japan)?.caption, 'Kiyomizu-dera');
  assert.equal(to.journal.cities().find((c) => c.custom)?.name, 'Osaka');
  assert.equal(to.files.list().length, 4);
  assert.ok(!to.files.list().some((name) => name.includes('old')));
  // Written for good: the app reopened finds it all.
  assert.deepEqual(openJournal({ db: to.db, atlas, files: to.files, now }).snapshot(), from.journal.snapshot());
});

test('a Photo added after an Import never takes the id of one deleted before the Export', async () => {
  const from = await travelled();
  // Ids 1 to 3 were given; the first was deleted.
  const to = phone();
  await applyExport(await readExport((await exported(from)).source()), { journal: to.journal, files: to.files });
  const [added] = await to.journal.addPhotos(japan, ['file:///camera/new.heic']);
  assert.equal(added.id, 4);
});

/** A phone holding a little, to see an Import refused leaves it as it was. */
async function holding() {
  const p = phone();
  p.journal.mark(japan, 'visited');
  p.journal.addTodo(japan, 'Onsen');
  await p.journal.addPhotos(japan, ['file:///camera/fuji.heic']);
  return p;
}

/** Imports `bytes` on a phone holding a little: the message it is refused with. Asserts the phone is untouched. */
async function refused(bytes: Uint8Array) {
  const p = await holding();
  const before = { journal: p.journal.snapshot(), files: await filesOf(p.files) };
  let message = '';
  try {
    await applyExport(await readExport(memoryBytes(bytes).source()), { journal: p.journal, files: p.files });
  } catch (error) {
    assert.ok(error instanceof InvalidExport, String(error));
    message = error.message;
  }
  assert.notEqual(message, '', 'refused');
  assert.deepEqual(p.journal.snapshot(), before.journal);
  assert.deepEqual(await filesOf(p.files), before.files);
  return message;
}

/** A zip of the given entries, as a file. */
async function zipOf(entries: Record<string, string | Uint8Array>) {
  const bytes = memoryBytes();
  const zip = zipWriter(bytes.sink);
  for (const [name, data] of Object.entries(entries)) {
    await zip.add(name, typeof data === 'string' ? new TextEncoder().encode(data) : data);
  }
  await zip.finish();
  return bytes.all();
}

/** The entries of a real Export, to spoil one of them; its JSON as text. */
async function exportEntries(): Promise<Record<string, string | Uint8Array>> {
  const zip = await readZip((await exported(await travelled())).source());
  const entries: Record<string, string | Uint8Array> = {};
  for (const name of zip.names()) entries[name] = await zip.read(name);
  entries['voyages.json'] = new TextDecoder().decode(entries['voyages.json'] as Uint8Array);
  return entries;
}

/** An Export whose JSON was changed by `change`. */
async function withJson(change: (json: any) => void) {
  const entries = await exportEntries();
  const json = JSON.parse(entries['voyages.json'] as string);
  change(json);
  entries['voyages.json'] = JSON.stringify(json);
  return zipOf(entries);
}

test('a file that is not an Export is refused, saying so, and nothing is touched', async () => {
  const notAnExport = 'Ce fichier n’est pas un Export de Globe trotter.';
  assert.equal(await refused(new TextEncoder().encode('%PDF-1.7 a PDF, say')), notAnExport);
  assert.equal(await refused(new Uint8Array()), notAnExport);
  assert.equal(await refused(await zipOf({ 'readme.txt': 'hello' })), notAnExport);
  assert.equal(await refused(await zipOf({ 'voyages.json': '{ not json' })), notAnExport);
  assert.equal(await refused(await zipOf({ 'voyages.json': '{"app":"other","version":1}' })), notAnExport);
});

test('an Export from a later version of the app is refused, saying to update it', async () => {
  assert.match(await refused(await withJson((json) => (json.version = 2))), /version plus récente/);
});

test('an Export whose Photo is missing or damaged is refused whole, and nothing is touched', async () => {
  const damaged = 'Cet Export est abîmé ou incomplet : il ne peut pas être importé.';
  const missing = await exportEntries();
  delete missing[Object.keys(missing).find((name) => name.endsWith('.thumb.jpg'))!];
  assert.equal(await refused(await zipOf(missing)), damaged);

  const spoilt = (await exported(await travelled())).all();
  // The last byte of the last Photo, just before the zip's directory, flipped.
  const directoryAt = new DataView(spoilt.buffer).getUint32(spoilt.length - 22 + 16, true);
  spoilt[directoryAt - 1] ^= 0xff;
  assert.equal(await refused(spoilt), damaged);
});

test('an Export whose records do not hold together is refused, and nothing is touched', async () => {
  const spoil = [
    (json: any) => (json.journal.places[0].mark = 'loved'),
    (json: any) => (json.journal.places[0].visitDate = '2019-13'),
    (json: any) => json.journal.places.push(json.journal.places[0]),
    (json: any) => (json.journal.todos[0].place = { level: 'country', id: '620' }),
    (json: any) => (json.journal.photos[0].file = '../../journal.db'),
    (json: any) => (json.journal.cities = []),
    (json: any) => delete json.journal.photos,
    (json: any) => (json.preferences.autoRotate = 'yes'),
  ];
  for (const change of spoil) assert.match(await refused(await withJson(change)), /abîmé ou incomplet/, String(change));
});

test('an Export without Planned dates, positions or Preferences imports, those left unset', async () => {
  const to = phone();
  const bytes = await withJson((json) => {
    delete json.preferences;
    for (const place of json.journal.places) {
      delete place.plannedDate;
      delete place.position;
    }
  });
  const contents = await readExport(memoryBytes(bytes).source());
  await applyExport(contents, { journal: to.journal, files: to.files });
  assert.deepEqual(contents.preferences, { photosOnGlobe: true, autoRotate: false });
  assert.deepEqual(to.journal.plans(), [{ countryId: '392', plannedDate: null }]);
  assert.equal(to.journal.itinerary('392').length, 3);
});

test('a Photo file that fails to be written leaves the Journal and the files as they were', async () => {
  const p = await holding();
  const before = { journal: p.journal.snapshot(), files: await filesOf(p.files) };
  const contents = await readExport((await exported(await travelled())).source());
  let writes = 0;
  const failing = { ...p.files, write: async (name: string, bytes: Uint8Array) => {
    if (++writes === 3) throw new Error('Disk full');
    await p.files.write(name, bytes);
  } };
  await assert.rejects(applyExport(contents, { journal: p.journal, files: failing }), /Disk full/);
  assert.deepEqual(p.journal.snapshot(), before.journal);
  assert.deepEqual(await filesOf(p.files), before.files);
});

test('resetting leaves no Place, Todo nor Photo, nor any Photo file: the app as first installed', async () => {
  const p = await travelled();
  resetAll({ journal: p.journal, files: p.files });
  assert.deepEqual(p.journal.snapshot(), { places: [], cities: [], todos: [], photos: [], lastPhotoId: 0 });
  assert.deepEqual(p.files.list(), []);
  assert.deepEqual(p.journal.byCountry(), []);
  assert.deepEqual(p.journal.plans(), []);
  assert.equal(p.journal.status(france), 'unexplored');
  assert.equal(p.journal.undo(), null);
  // For good: the app reopened finds nothing either.
  assert.deepEqual(openJournal({ db: p.db, atlas, now }).snapshot().places, []);
});
