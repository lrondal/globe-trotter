/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { openJournal, type Journal, type PlaceRef } from './journal.ts';
import { memoryDatabase } from './memoryDatabase.ts';
import { memoryPhotoFiles } from './memoryPhotoFiles.ts';

/** Regions of Japan, the only Places of the test Atlas inside another. */
const REGIONS: Record<string, string> = { kansai: '392', kanto: '392' };

/**
 * The test Atlas's land, by longitude: Japan east of 130° E, Kansai west of 137° E and Kanto
 * east of it; Okinawa from 126° to 129° E; and France from 0° to 5° E. The sea elsewhere.
 */
async function locate({ lon }: { lon: number; lat: number }) {
  if (lon >= 130) return { countryId: '392', regionId: lon < 137 ? 'kansai' : 'kanto' };
  if (lon >= 126 && lon < 129) return { countryId: '392', islandId: 'i-okinawa' };
  if (lon >= 0 && lon < 5) return { countryId: '250' };
  return null;
}

const atlas = {
  places: ['250', '392', '620', 'x-kosovo'].map((id) => ({ level: 'country', id }) as const),
  containerOf: (place: PlaceRef): PlaceRef | null =>
    place.level === 'region' ? { level: 'country', id: REGIONS[place.id] } : null,
  locate,
  countryOf: (place: PlaceRef): string =>
    place.level === 'region' ? REGIONS[place.id] : place.id === 'i-okinawa' ? '392' : place.id,
};
const france = { level: 'country', id: '250' } as const;

function journal(now = new Date(2026, 9, 18)) {
  return openJournal({ db: memoryDatabase(), atlas, now: () => now });
}

test('a Country marked Visited is Visited', () => {
  const j = journal();
  j.mark(france, 'visited');
  assert.equal(j.status(france), 'visited');
});

test('Marks survive closing and reopening the app', () => {
  const db = memoryDatabase();
  openJournal({ db, atlas }).mark(france, 'wish');
  assert.equal(openJournal({ db, atlas }).status(france), 'wish');
});

test('removing the Mark returns a Country to Unexplored', () => {
  const j = journal();
  j.mark(france, 'visited');
  j.mark(france, null);
  assert.equal(j.status(france), 'unexplored');
});

test('a Visited Country gets the current month as Visit date', () => {
  const j = journal(new Date(2026, 9, 18));
  j.mark(france, 'visited');
  assert.equal(j.place(france)?.visitDate, '2026-10');
});

const japan = { level: 'country', id: '392' } as const;

test('undo takes back the last change of Mark, and only that one', () => {
  const j = journal();
  j.mark(france, 'visited');
  j.mark(japan, 'wish');
  assert.deepEqual(j.undo(), japan);
  assert.equal(j.status(japan), 'unexplored');
  assert.equal(j.status(france), 'visited');
  assert.equal(j.undo(), null);
  assert.equal(j.status(france), 'visited');
});

test('undoing a change away from Visited gives back the Visit date it had', () => {
  let today = new Date(2024, 4, 2);
  const j = openJournal({ db: memoryDatabase(), atlas, now: () => today });
  j.mark(france, 'visited');
  today = new Date(2026, 9, 18);
  j.mark(france, 'wish');
  j.undo();
  assert.equal(j.status(france), 'visited');
  assert.equal(j.place(france)?.visitDate, '2024-05');
});

test('an undone Mark stays undone after reopening the app', () => {
  const db = memoryDatabase();
  const j = openJournal({ db, atlas });
  j.mark(france, 'visited');
  j.undo();
  assert.equal(openJournal({ db, atlas }).status(france), 'unexplored');
});

test('removing the Mark keeps the Note of the Country', () => {
  const j = journal();
  j.writeNote(france, 'Le marché de Sarlat');
  j.mark(france, 'visited');
  j.mark(france, null);
  assert.equal(j.place(france)?.note, 'Le marché de Sarlat');
  assert.equal(j.status(france), 'unexplored');
});

test('a Country left with no Mark and no content has no record in the Journal', () => {
  const j = journal();
  j.mark(france, 'wish');
  j.mark(france, null);
  assert.equal(j.place(france), null);
});

test('the filter chips count the Countries of each Status', () => {
  const j = journal();
  assert.deepEqual(j.counts(), { visited: 0, wish: 0, unexplored: 4 });
  j.mark(france, 'visited');
  j.mark(japan, 'visited');
  j.mark({ level: 'country', id: '620' }, 'wish');
  j.writeNote({ level: 'country', id: 'x-kosovo' }, 'Prizren, un jour');
  assert.deepEqual(j.counts(), { visited: 2, wish: 1, unexplored: 1 });
});

test('undoing the removal of a Mark gives back the Mark and its Visit date', () => {
  let today = new Date(2019, 6, 1);
  const j = openJournal({ db: memoryDatabase(), atlas, now: () => today });
  j.mark(france, 'visited');
  today = new Date(2026, 9, 18);
  j.mark(france, null);
  j.undo();
  assert.equal(j.status(france), 'visited');
  assert.equal(j.place(france)?.visitDate, '2019-07');
});

const greece = { level: 'country', id: '300' } as const;
const crete = { level: 'island', id: 'i-crete' } as const;

test('an Island marked Visited leaves its Country Unexplored', () => {
  const j = journal();
  j.mark(crete, 'visited');
  assert.equal(j.status(crete), 'visited');
  assert.equal(j.status(greece), 'unexplored');
});

test('a Country marked Visited leaves its Islands Unexplored', () => {
  const j = journal();
  j.mark(greece, 'visited');
  assert.equal(j.status(crete), 'unexplored');
});

test('the filter chips count Islands alongside Countries', () => {
  const places = [france, greece, crete, { level: 'island', id: 'i-corse' } as const];
  const j = openJournal({ db: memoryDatabase(), atlas: { ...atlas, places } });
  j.mark(crete, 'visited');
  assert.deepEqual(j.counts(), { visited: 1, wish: 0, unexplored: 3 });
  j.mark(greece, 'wish');
  assert.deepEqual(j.counts(), { visited: 1, wish: 1, unexplored: 2 });
});

test('undo takes back the Mark of an Island', () => {
  const j = journal();
  j.mark(crete, 'wish');
  assert.deepEqual(j.undo(), crete);
  assert.equal(j.status(crete), 'unexplored');
});

test('the Mark of an Island survives closing and reopening the app', () => {
  const db = memoryDatabase();
  openJournal({ db, atlas }).mark(crete, 'visited');
  const reopened = openJournal({ db, atlas });
  assert.equal(reopened.status(crete), 'visited');
  assert.equal(reopened.status(greece), 'unexplored');
});

/** The Todos of `place` as the user reads them: text and tick, in order. */
const todosOf = (j: ReturnType<typeof journal>, place: typeof japan) =>
  j.todos(place).map(({ text, done }) => ({ text, done }));

test('Todos added to a Place are listed in the order they were added, unchecked', () => {
  const j = journal();
  j.addTodo(japan, 'Réserver le ryokan');
  j.addTodo(japan, 'Voir le Fushimi Inari');
  assert.deepEqual(todosOf(j, japan), [
    { text: 'Réserver le ryokan', done: false },
    { text: 'Voir le Fushimi Inari', done: false },
  ]);
});

test('a checked Todo stays checked after reopening the app, and can be unchecked', () => {
  const db = memoryDatabase();
  const j = openJournal({ db, atlas });
  j.addTodo(japan, 'Réserver le ryokan');
  const inari = j.addTodo(japan, 'Voir le Fushimi Inari');
  j.checkTodo(inari.id, true);
  const reopened = openJournal({ db, atlas });
  assert.deepEqual(todosOf(reopened, japan), [
    { text: 'Réserver le ryokan', done: false },
    { text: 'Voir le Fushimi Inari', done: true },
  ]);
  reopened.checkTodo(inari.id, false);
  assert.equal(reopened.todos(japan)[1].done, false);
});

test('a Todo moved by hand keeps its new place in the list after reopening the app', () => {
  const db = memoryDatabase();
  const j = openJournal({ db, atlas });
  j.addTodo(japan, 'Réserver le ryokan');
  j.addTodo(japan, 'Acheter le JR Pass');
  const inari = j.addTodo(japan, 'Voir le Fushimi Inari');
  j.moveTodo(inari.id, 0);
  const order = ['Voir le Fushimi Inari', 'Réserver le ryokan', 'Acheter le JR Pass'];
  assert.deepEqual(j.todos(japan).map((t) => t.text), order);
  assert.deepEqual(openJournal({ db, atlas }).todos(japan).map((t) => t.text), order);
  j.moveTodo(inari.id, 2);
  assert.deepEqual(
    openJournal({ db, atlas }).todos(japan).map((t) => t.text),
    ['Réserver le ryokan', 'Acheter le JR Pass', 'Voir le Fushimi Inari'],
  );
});

test('a deleted Todo is gone for good, and the next one added still comes last', () => {
  const db = memoryDatabase();
  const j = openJournal({ db, atlas });
  const ryokan = j.addTodo(japan, 'Réserver le ryokan');
  j.addTodo(japan, 'Acheter le JR Pass');
  j.addTodo(japan, 'Voir le Fushimi Inari');
  j.deleteTodo(ryokan.id);
  j.addTodo(japan, 'Goûter un okonomiyaki');
  const order = ['Acheter le JR Pass', 'Voir le Fushimi Inari', 'Goûter un okonomiyaki'];
  assert.deepEqual(j.todos(japan).map((t) => t.text), order);
  assert.deepEqual(openJournal({ db, atlas }).todos(japan).map((t) => t.text), order);
});

test('a Note survives reopening the app, and erasing it lets an unmarked Place go', () => {
  const db = memoryDatabase();
  openJournal({ db, atlas }).writeNote(crete, 'Les gorges de Samaria');
  const reopened = openJournal({ db, atlas });
  assert.equal(reopened.place(crete)?.note, 'Les gorges de Samaria');
  reopened.writeNote(crete, '');
  assert.equal(openJournal({ db, atlas }).place(crete), null);
});

test('a Note or Todos on a Place without a Mark leave it Unexplored, but in the Journal', () => {
  const j = journal();
  j.writeNote(france, 'Le marché de Sarlat');
  const ryokan = j.addTodo(japan, 'Réserver le ryokan');
  assert.equal(j.status(france), 'unexplored');
  assert.equal(j.status(japan), 'unexplored');
  assert.deepEqual(j.counts(), { visited: 0, wish: 0, unexplored: 4 });
  assert.notEqual(j.place(japan), null);
  j.deleteTodo(ryokan.id);
  assert.equal(j.place(japan), null);
});

test('removing the Mark keeps the Todos of the Place', () => {
  const j = journal();
  j.mark(japan, 'wish');
  j.addTodo(japan, 'Réserver le ryokan');
  j.mark(japan, null);
  assert.equal(j.status(japan), 'unexplored');
  assert.notEqual(j.place(japan), null);
  assert.deepEqual(todosOf(j, japan), [{ text: 'Réserver le ryokan', done: false }]);
});

const kansai = { level: 'region', id: 'kansai' } as const;
const kanto = { level: 'region', id: 'kanto' } as const;

test('a Region marked Visited makes its Country Visited, via the Region', () => {
  const j = journal();
  j.mark(kansai, 'visited');
  assert.equal(j.status(japan), 'visited');
  assert.deepEqual(j.via(japan), [kansai]);
  assert.equal(j.place(japan), null, 'the Country gets no Mark of its own');
});

test('a Visited Region outranks the Wish Mark of its Country', () => {
  const j = journal();
  j.mark(japan, 'wish');
  j.mark(kanto, 'wish');
  j.mark(kansai, 'visited');
  assert.equal(j.status(japan), 'visited');
  assert.deepEqual(j.via(japan), [kansai]);
});

test('a Country Visited by its own Mark shows no provenance', () => {
  const j = journal();
  j.mark(kansai, 'visited');
  j.mark(japan, 'visited');
  assert.equal(j.status(japan), 'visited');
  assert.deepEqual(j.via(japan), []);
});

test('a Wish Region makes its Country Wish, via every Wish Region', () => {
  const j = journal();
  j.mark(kansai, 'wish');
  j.mark(kanto, 'wish');
  assert.equal(j.status(japan), 'wish');
  assert.deepEqual(j.via(japan), [kansai, kanto]);
});

test('removing the Mark of the last Region returns its Country to its own Mark', () => {
  const j = journal();
  j.mark(japan, 'wish');
  j.mark(kansai, 'visited');
  j.mark(kansai, null);
  assert.equal(j.status(japan), 'wish');
  j.mark(japan, null);
  assert.equal(j.status(japan), 'unexplored');
});

test('Retirer is offered on a Mark that makes the Status, not on an inherited Status', () => {
  const j = journal();
  j.mark(kansai, 'visited');
  assert.equal(j.canRemoveMark(kansai), true);
  assert.equal(j.canRemoveMark(japan), false, 'Visited only through Kansai');
  j.mark(japan, 'wish');
  assert.equal(j.canRemoveMark(japan), false, 'its Wish Mark changes nothing it shows');
  j.mark(japan, 'visited');
  assert.equal(j.canRemoveMark(japan), true);
  assert.equal(j.canRemoveMark(france), false, 'no Mark to remove');
});

test('the filter chips count a Country by its inherited Status', () => {
  const j = journal();
  j.mark(kansai, 'visited');
  assert.deepEqual(j.counts(), { visited: 1, wish: 0, unexplored: 3 });
});

test('the Mark of a Region survives reopening the app, and still reaches its Country', () => {
  const db = memoryDatabase();
  openJournal({ db, atlas }).mark(kansai, 'visited');
  const reopened = openJournal({ db, atlas });
  assert.equal(reopened.status(kansai), 'visited');
  assert.deepEqual(reopened.via(japan), [kansai]);
});

/** Cities of the built-in list, as the Atlas gives them. */
const kyoto = { level: 'city', id: '1857910', name: 'Kyōto', lon: 135.75, lat: 35.02, countryId: '392', regionId: 'kansai' } as const;

test('adding the same City of the list twice makes a single Place', () => {
  const j = journal();
  j.mark(kyoto, 'wish');
  j.mark({ ...kyoto }, 'visited');
  assert.deepEqual(
    j.cities().map((c) => c.id),
    [kyoto.id],
  );
  assert.equal(j.status(kyoto), 'visited');
});

test('a City marked Visited makes its Region and its Country Visited, via the City', () => {
  const j = journal();
  j.mark(kyoto, 'visited');
  assert.equal(j.status(kansai), 'visited');
  assert.equal(j.status(japan), 'visited');
  assert.deepEqual(j.via(kansai), [{ level: 'city', id: kyoto.id }]);
  assert.equal(j.counts().visited, 1);
});

const naha = { level: 'city', id: '1856035', name: 'Naha', lon: 127.68, lat: 26.21, countryId: '392', islandId: 'i-okinawa' } as const;

test('a City on an Island makes the Island Visited, and not its Country', () => {
  const j = journal();
  j.mark(naha, 'visited');
  assert.equal(j.status({ level: 'island', id: 'i-okinawa' }), 'visited');
  assert.equal(j.status(japan), 'unexplored');
});

test('undoing the Mark that put a City in the Journal takes it back out', () => {
  const j = journal();
  j.mark(kyoto, 'visited');
  j.undo();
  assert.deepEqual(j.cities(), []);
  assert.equal(j.status(japan), 'unexplored');
});

test('a City stays in the Journal once its Mark is removed, and after reopening the app', () => {
  const db = memoryDatabase();
  const j = openJournal({ db, atlas });
  j.mark(kyoto, 'visited');
  j.mark(kyoto, null);
  const reopened = openJournal({ db, atlas });
  assert.deepEqual(reopened.city(kyoto.id), kyoto);
  assert.equal(reopened.status(kyoto), 'unexplored');
});

test('a City reaches its Country after reopening the app', () => {
  const db = memoryDatabase();
  openJournal({ db, atlas }).mark(kyoto, 'wish');
  assert.equal(openJournal({ db, atlas }).status(japan), 'wish');
});

test('a Country lists the Cities inside it, those of its Regions too, by name', () => {
  const j = journal();
  const osaka = { ...kyoto, id: '1853909', name: 'Ōsaka' };
  const sapporo = { ...kyoto, id: '2128295', name: 'Sapporo', regionId: undefined };
  j.mark(osaka, 'visited');
  j.mark(sapporo, 'wish');
  j.mark(kyoto, 'visited');
  j.mark(naha, 'visited');
  assert.deepEqual(j.citiesIn(japan).map((c) => c.name), ['Kyōto', 'Ōsaka', 'Sapporo']);
  assert.deepEqual(j.citiesIn(kansai).map((c) => c.name), ['Kyōto', 'Ōsaka']);
});

test('writing a Note on a City of the list puts it in the Journal, Unexplored', () => {
  const j = journal();
  j.writeNote(kyoto, 'Le Pavillon d’or');
  assert.deepEqual(j.cities().map((c) => c.id), [kyoto.id]);
  assert.equal(j.status(japan), 'unexplored');
});

test('a Custom City dropped in the ocean is refused, and nothing is created', async () => {
  const j = journal();
  assert.equal(await j.createCity('Point Nemo', { lon: -123.4, lat: -48.9 }), null);
  assert.deepEqual(j.cities(), []);
});

test('a Custom City dropped on land is in the Journal, in the Country and Region at its point', async () => {
  const db = memoryDatabase();
  const j = openJournal({ db, atlas });
  const city = await j.createCity('Ohara', { lon: 135.83, lat: 35.12 });
  assert.ok(city);
  assert.equal(city.custom, true);
  assert.equal(j.status(city), 'unexplored');
  const reopened = openJournal({ db, atlas });
  assert.deepEqual(reopened.city(city.id), city);
  assert.deepEqual(reopened.citiesIn(kansai).map((c) => c.name), ['Ohara']);
  reopened.mark(city, 'visited');
  assert.deepEqual(reopened.via(japan), [kansai]);
  assert.deepEqual(reopened.via(kansai), [{ level: 'city', id: city.id }]);
});

test('Custom Cities never share an id, with each other or with a City of the list', async () => {
  const j = journal();
  const one = await j.createCity('Ohara', { lon: 135.83, lat: 35.12 });
  const two = await j.createCity('Ohara', { lon: 135.83, lat: 35.12 });
  j.mark(kyoto, 'wish');
  assert.equal(new Set([one?.id, two?.id, kyoto.id]).size, 3);
  assert.equal(j.cities().length, 3);
});

test('a renamed Custom City keeps its new name after reopening the app, and its place in the Journal', async () => {
  const db = memoryDatabase();
  const j = openJournal({ db, atlas });
  const city = (await j.createCity('Ohara', { lon: 135.83, lat: 35.12 }))!;
  j.mark(city, 'wish');
  j.renameCity(city.id, 'Ōhara');
  const reopened = openJournal({ db, atlas });
  assert.equal(reopened.city(city.id)?.name, 'Ōhara');
  assert.equal(reopened.status(city), 'wish');
});

test('a Custom City moved elsewhere takes its Status to the Country and Region at its new point', async () => {
  const db = memoryDatabase();
  const j = openJournal({ db, atlas });
  const city = (await j.createCity('Ohara', { lon: 135.83, lat: 35.12 }))!;
  j.mark(city, 'visited');
  assert.equal(await j.moveCity(city.id, { lon: 139.2, lat: 35.6 }), true);
  assert.equal(j.status(kansai), 'unexplored');
  assert.equal(j.status(kanto), 'visited');
  assert.deepEqual(j.citiesIn(kanto).map((c) => c.name), ['Ohara']);
  assert.deepEqual(openJournal({ db, atlas }).city(city.id), { ...city, lon: 139.2, lat: 35.6, regionId: 'kanto' });
  await j.moveCity(city.id, { lon: 127.8, lat: 26.3 });
  assert.equal(j.status({ level: 'island', id: 'i-okinawa' }), 'visited');
  assert.equal(j.status(japan), 'unexplored', 'on an Island, in no Region of its Country');
  await j.moveCity(city.id, { lon: 2.35, lat: 48.85 });
  assert.equal(j.status(france), 'visited');
  assert.equal(j.city(city.id)?.regionId, undefined);
});

test('a Custom City moved into the ocean stays where it was', async () => {
  const j = journal();
  const city = (await j.createCity('Ohara', { lon: 135.83, lat: 35.12 }))!;
  assert.equal(await j.moveCity(city.id, { lon: -30, lat: 40 }), false);
  assert.deepEqual(j.city(city.id), city);
});

test('a City of the list can be neither renamed nor moved', async () => {
  const j = journal();
  j.mark(kyoto, 'visited');
  assert.throws(() => j.renameCity(kyoto.id, 'Kyoto'));
  await assert.rejects(j.moveCity(kyoto.id, { lon: 139.2, lat: 35.6 }));
  assert.deepEqual(j.city(kyoto.id), kyoto);
});

test('the Visit date of a Visited Place can be set back to an earlier trip, and survives reopening the app', () => {
  const db = memoryDatabase();
  const j = openJournal({ db, atlas, now: () => new Date(2026, 9, 18) });
  j.mark(france, 'visited');
  j.setVisitDate(france, '2019-07');
  assert.equal(j.place(france)?.visitDate, '2019-07');
  assert.equal(openJournal({ db, atlas }).place(france)?.visitDate, '2019-07');
});

test('only a Place marked Visited has a Visit date to set, not one Visited through the Places inside it', () => {
  const j = journal();
  j.mark(france, 'wish');
  j.mark(kansai, 'visited');
  assert.throws(() => j.setVisitDate(france, '2019-07'));
  assert.throws(() => j.setVisitDate(japan, '2019-07'));
  assert.equal(j.place(france)?.visitDate, null);
  assert.equal(j.place(japan), null);
});

test('a Visit date is a month gone by or the current one, never one to come', () => {
  const j = journal(new Date(2026, 9, 18));
  j.mark(france, 'visited');
  assert.throws(() => j.setVisitDate(france, '2026-11'));
  assert.throws(() => j.setVisitDate(france, '2019-13'));
  assert.throws(() => j.setVisitDate(france, '2019'));
  assert.equal(j.place(france)?.visitDate, '2026-10');
  j.setVisitDate(france, '2026-10');
  assert.equal(j.place(france)?.visitDate, '2026-10');
});

test('a Place without a Visit date of its own spans the Visit dates of the Places inside it', () => {
  const j = journal(new Date(2026, 9, 18));
  assert.equal(j.visitDates(japan), null);
  j.mark(kyoto, 'visited');
  j.setVisitDate(kyoto, '2024-04');
  j.mark(kanto, 'visited');
  j.setVisitDate(kanto, '2019-03');
  j.mark(naha, 'visited');
  j.setVisitDate(naha, '2012-08');
  j.mark({ ...kyoto, id: '1853909', name: 'Ōsaka' }, 'wish');
  assert.deepEqual(j.visitDates(japan), { from: '2019-03', to: '2024-04' }, 'not Naha, on an Island');
  assert.deepEqual(j.visitDates(kansai), { from: '2024-04', to: '2024-04' });
  assert.deepEqual(j.visitDates({ level: 'island', id: 'i-okinawa' }), { from: '2012-08', to: '2012-08' });
});

test('a Place with a Visit date of its own shows that date, whatever the Places inside it say', () => {
  const j = journal(new Date(2026, 9, 18));
  j.mark(kyoto, 'visited');
  j.setVisitDate(kyoto, '2024-04');
  j.mark(kanto, 'visited');
  j.setVisitDate(kanto, '2019-03');
  j.mark(japan, 'visited');
  j.setVisitDate(japan, '2022-11');
  assert.deepEqual(j.visitDates(japan), { from: '2022-11', to: '2022-11' });
  j.mark(japan, null);
  assert.deepEqual(j.visitDates(japan), { from: '2019-03', to: '2024-04' }, 'the range again, once its own date goes');
});

test('undoing the removal of a Mark gives back the Visit date as the user set it', () => {
  const j = journal(new Date(2026, 9, 18));
  j.mark(france, 'visited');
  j.setVisitDate(france, '2019-07');
  j.mark(france, null);
  j.undo();
  assert.equal(j.place(france)?.visitDate, '2019-07');
});

test('Photos added to a Place are copied into the app and listed in the order they were added', async () => {
  const files = memoryPhotoFiles();
  const j = openJournal({ db: memoryDatabase(), atlas, files });
  const [first, second] = await j.addPhotos(france, ['file:///roll/sarlat.heic', 'file:///roll/annecy.heic']);
  const [third] = await j.addPhotos(france, ['file:///camera/lyon.jpg']);
  assert.deepEqual(j.photos(france).map((p) => p.id), [first.id, second.id, third.id]);
  assert.equal(files.held().length, 6);
  assert.ok(files.held().includes(first.file) && files.held().includes(first.thumbnail));
  assert.equal(j.status(france), 'unexplored');
  assert.notEqual(j.place(france), null);
});

test('a deleted Photo is gone with its files, and the last one lets an unmarked Place go', async () => {
  const files = memoryPhotoFiles();
  const db = memoryDatabase();
  const j = openJournal({ db, atlas, files });
  const [sarlat, annecy] = await j.addPhotos(france, ['sarlat.heic', 'annecy.heic']);
  j.deletePhoto(sarlat.id);
  assert.deepEqual(openJournal({ db, atlas }).photos(france).map((p) => p.id), [annecy.id]);
  assert.deepEqual(files.held().sort(), [annecy.file, annecy.thumbnail].sort());
  j.deletePhoto(annecy.id);
  assert.deepEqual(files.held(), []);
  assert.equal(j.place(france), null);
});

test('a Caption written on a Photo survives reopening the app, and can be erased', async () => {
  const db = memoryDatabase();
  const j = openJournal({ db, atlas, files: memoryPhotoFiles() });
  const [photo] = await j.addPhotos(france, ['sarlat.heic']);
  assert.equal(photo.caption, '');
  j.setCaption(photo.id, 'Le marché du samedi');
  assert.equal(openJournal({ db, atlas }).photos(france)[0].caption, 'Le marché du samedi');
  j.setCaption(photo.id, '');
  assert.equal(j.photos(france)[0].caption, '');
});

test('a Caption is one line of 200 characters at most', async () => {
  const j = openJournal({ db: memoryDatabase(), atlas, files: memoryPhotoFiles() });
  const [photo] = await j.addPhotos(france, ['sarlat.heic']);
  j.setCaption(photo.id, 'a'.repeat(200));
  assert.throws(() => j.setCaption(photo.id, 'a'.repeat(201)));
  assert.throws(() => j.setCaption(photo.id, 'Sarlat\nle samedi'));
  assert.equal(j.photos(france)[0].caption, 'a'.repeat(200));
});

test('a Country lists the Photos of the Places inside it, apart from its own, in the order they were added', async () => {
  const j = openJournal({ db: memoryDatabase(), atlas, files: memoryPhotoFiles() });
  const [temple] = await j.addPhotos(kyoto, ['temple.heic']);
  const [nara] = await j.addPhotos(kansai, ['nara.heic']);
  await j.addPhotos(japan, ['fuji.heic']);
  await j.addPhotos(naha, ['plage.heic']);
  const [gion] = await j.addPhotos(kyoto, ['gion.heic']);
  assert.deepEqual(j.photosInside(japan).map((p) => p.id), [temple.id, nara.id, gion.id]);
  assert.deepEqual(j.photosInside(kansai).map((p) => p.id), [temple.id, gion.id]);
  assert.deepEqual(j.photosInside(kyoto), []);
  assert.equal(j.city(kyoto.id)?.name, 'Kyōto');
});

test('without a choice, the Cover photo is the first Photo of the Place, or else the first inside it', async () => {
  const j = openJournal({ db: memoryDatabase(), atlas, files: memoryPhotoFiles() });
  assert.equal(j.coverPhoto(japan), null);
  const [temple] = await j.addPhotos(kyoto, ['temple.heic']);
  assert.equal(j.coverPhoto(japan)?.id, temple.id);
  const [fuji] = await j.addPhotos(japan, ['fuji.heic', 'tokyo.heic']);
  assert.equal(j.coverPhoto(japan)?.id, fuji.id);
});

test('a Cover photo chosen among the Photos inside a Place survives reopening the app', async () => {
  const db = memoryDatabase();
  const j = openJournal({ db, atlas, files: memoryPhotoFiles() });
  await j.addPhotos(japan, ['fuji.heic']);
  const [, gion] = await j.addPhotos(kyoto, ['temple.heic', 'gion.heic']);
  j.setCoverPhoto(japan, gion.id);
  assert.equal(openJournal({ db, atlas }).coverPhoto(japan)?.id, gion.id);
});

test('a Cover photo is chosen only among the Photos of the Place and of the Places inside it', async () => {
  const j = openJournal({ db: memoryDatabase(), atlas, files: memoryPhotoFiles() });
  const [sarlat] = await j.addPhotos(france, ['sarlat.heic']);
  const [fuji] = await j.addPhotos(japan, ['fuji.heic']);
  await j.addPhotos(kyoto, ['temple.heic']);
  assert.throws(() => j.setCoverPhoto(japan, sarlat.id));
  assert.throws(() => j.setCoverPhoto(kyoto, fuji.id));
  assert.equal(j.coverPhoto(japan)?.id, fuji.id);
});

test('a chosen Cover photo deleted falls back to the first Photo, even once its id comes back', async () => {
  const db = memoryDatabase();
  const files = memoryPhotoFiles();
  const j = openJournal({ db, atlas, files });
  const [fuji, tokyo] = await j.addPhotos(japan, ['fuji.heic', 'tokyo.heic']);
  j.setCoverPhoto(japan, tokyo.id);
  j.deletePhoto(tokyo.id);
  assert.equal(j.coverPhoto(japan)?.id, fuji.id);
  const reopened = openJournal({ db, atlas, files });
  await reopened.addPhotos(japan, ['osaka.heic']);
  assert.equal(reopened.coverPhoto(japan)?.id, fuji.id);
});

test('a chosen Cover photo whose City moves out of the Place falls back to the first Photo inside it', async () => {
  const j = openJournal({ db: memoryDatabase(), atlas, files: memoryPhotoFiles() });
  const city = await j.createCity('Le ryokan', { lon: 135, lat: 35 });
  const [ryokan] = await j.addPhotos(city!, ['ryokan.heic']);
  const [temple] = await j.addPhotos(kyoto, ['temple.heic']);
  j.setCoverPhoto(kansai, ryokan.id);
  await j.moveCity(city!.id, { lon: 139.7, lat: 35.7 });
  assert.equal(j.coverPhoto(kansai)?.id, temple.id);
});

test('the Places with Photos are those holding some, and those with some inside them', async () => {
  const j = openJournal({ db: memoryDatabase(), atlas, files: memoryPhotoFiles() });
  await j.addPhotos(kyoto, ['temple.heic']);
  await j.addPhotos(naha, ['plage.heic']);
  await j.addPhotos(france, ['sarlat.heic']);
  const keys = (places: PlaceRef[]) => places.map(({ level, id }) => `${level}:${id}`).sort();
  assert.deepEqual(keys(j.photographed()), keys([kyoto, kansai, japan, naha, { level: 'island', id: 'i-okinawa' }, france]));
});

test('a deleted Photo leaves its id behind for good, even after reopening the app', async () => {
  const db = memoryDatabase();
  const files = memoryPhotoFiles();
  const [photo] = await openJournal({ db, atlas, files }).addPhotos(france, ['sarlat.heic']);
  openJournal({ db, atlas, files }).deletePhoto(photo.id);
  const [next] = await openJournal({ db, atlas, files }).addPhotos(france, ['annecy.heic']);
  assert.notEqual(next.id, photo.id);
});

/** The Journal view's list, as « Country: level:id … » lines, Countries and Places sorted. */
const listed = (j: Journal) =>
  j
    .byCountry()
    .map(({ countryId, places }) => `${countryId}: ${places.map((p) => `${p.level}:${p.id}`).sort().join(' ')}`)
    .sort();

test('the Journal view lists the Places with a Mark or a Note, by Country, the Unexplored ones too', () => {
  const j = journal();
  j.mark(france, 'visited');
  j.writeNote(japan, 'Les cerisiers en avril');
  assert.deepEqual(listed(j), ['250: country:250', '392: country:392']);
});

test('the Journal view lists Regions, Islands and Cities under their Country, with Todos or Photos as content', async () => {
  const j = openJournal({ db: memoryDatabase(), atlas, files: memoryPhotoFiles() });
  j.mark(kansai, 'wish');
  j.addTodo({ level: 'island', id: 'i-okinawa' }, 'Plonger à Kerama');
  await j.addPhotos(naha, ['marché.heic']);
  j.mark(kyoto, 'visited');
  assert.deepEqual(listed(j), [`392: city:${naha.id} city:${kyoto.id} island:i-okinawa region:kansai`]);
});

test('the Journal view leaves out a Place holding only a choice of Cover photo, or a City whose Mark was removed', async () => {
  const j = openJournal({ db: memoryDatabase(), atlas, files: memoryPhotoFiles() });
  const [temple] = await j.addPhotos(kyoto, ['temple.heic']);
  j.setCoverPhoto(japan, temple.id);
  const osaka = { ...kyoto, id: '1853909', name: 'Ōsaka' };
  j.mark(osaka, 'visited');
  j.mark(osaka, null);
  assert.deepEqual(listed(j), [`392: city:${kyoto.id}`]);
});

/** The Wishlist as sorted « level:id » keys. */
const wished = (j: Journal) =>
  j
    .wishlist()
    .map((p) => `${p.level}:${p.id}`)
    .sort();

test('the Wishlist lists the Countries, Islands, Regions and Cities marked Wish', () => {
  const j = journal();
  j.mark(france, 'wish');
  j.mark(kansai, 'wish');
  j.mark({ level: 'island', id: 'i-okinawa' }, 'wish');
  j.mark(kyoto, 'wish');
  assert.deepEqual(wished(j), [`city:${kyoto.id}`, 'country:250', 'island:i-okinawa', 'region:kansai']);
});

test('the Wishlist leaves out a Place that is Wish only through a Place inside it, and one no longer marked Wish', () => {
  const j = journal();
  j.mark(kyoto, 'wish');
  j.mark(france, 'wish');
  j.mark(france, 'visited');
  j.mark(kanto, 'wish');
  j.mark(kanto, null);
  assert.equal(j.status(japan), 'wish');
  assert.deepEqual(wished(j), [`city:${kyoto.id}`]);
});

/** A Country's page, as « level:id: city:id … » lines, then « autres: city:id … », all sorted. */
const page = (j: Journal, countryId: string) => {
  const { regions, islands, otherCities } = j.countryPage(countryId);
  const ids = (cities: readonly PlaceRef[]) => cities.map((c) => `city:${c.id}`).sort().join(' ');
  return [
    ...[...regions, ...islands].map(({ place, cities }) => `${place.level}:${place.id}: ${ids(cities)}`.trim()).sort(),
    `autres: ${ids(otherCities)}`.trim(),
  ];
};

test('a Country’s page lists its Regions with a Mark or content, each with its Cities with a Mark or content', () => {
  const j = journal();
  const osaka = { ...kyoto, id: '1853909', name: 'Ōsaka' };
  j.mark(kyoto, 'visited');
  j.writeNote(osaka, 'Dōtonbori la nuit');
  j.mark(kanto, 'wish');
  j.mark(france, 'visited');
  assert.deepEqual(page(j, '392'), [`region:kansai: city:${osaka.id} city:${kyoto.id}`, 'region:kanto:', 'autres:']);
});

test('a Country’s page lists a City on an Island under the Island, never a Region, and one in neither under « Autres villes »', () => {
  const j = journal();
  const onOkinawa = { ...naha, id: '1861416', name: 'Itoman', regionId: 'kansai' };
  const sapporo = { ...kyoto, id: '2128295', name: 'Sapporo', regionId: undefined };
  const unmarked = { ...kyoto, id: '1853909', name: 'Ōsaka' };
  j.mark(naha, 'wish');
  j.mark(onOkinawa, 'visited');
  j.mark(sapporo, 'wish');
  j.mark(unmarked, 'visited');
  j.mark(unmarked, null);
  j.mark(japan, 'visited');
  assert.deepEqual(page(j, '392'), [`island:i-okinawa: city:${naha.id} city:${onOkinawa.id}`, `autres: city:${sapporo.id}`]);
});

test('a Country’s page lists an Island with a Mark or content, without Cities, and nothing of another Country', () => {
  const j = journal();
  j.addTodo({ level: 'island', id: 'i-okinawa' }, 'Plonger à Kerama');
  j.mark({ ...kyoto, id: '2988507', name: 'Paris', countryId: '250', regionId: undefined }, 'wish');
  assert.deepEqual(page(j, '392'), ['island:i-okinawa:', 'autres:']);
  assert.deepEqual(page(j, '250'), ['autres: city:2988507']);
});

test('wishing marks Wish a Place with no Mark of its own, a City of the list entering the Journal with it', () => {
  const j = journal();
  j.mark(kyoto, 'visited');
  assert.equal(j.wish(kansai), null);
  assert.equal(j.wish(naha), null);
  assert.deepEqual(wished(j), [`city:${naha.id}`, 'region:kansai']);
  assert.equal(j.city(naha.id)?.name, naha.name);
});

test('wishing a Place marked Visited or Wish already keeps its Mark, and says which', () => {
  const j = journal();
  j.mark(france, 'visited');
  j.mark(kanto, 'wish');
  assert.equal(j.wish(france), 'visited');
  assert.equal(j.wish(kanto), 'wish');
  assert.equal(j.place(france)?.mark, 'visited');
  assert.deepEqual(wished(j), ['region:kanto']);
});

test('undo after wishing a Place newly marked takes the Wish back out, and its City with it', () => {
  const j = journal();
  j.wish(naha);
  j.undo();
  assert.deepEqual(wished(j), []);
  assert.equal(j.city(naha.id), null);
});

/** The Planned date of the Plan of a Country; undefined when the Country is no Plan. */
const plannedDate = (j: Journal, countryId: string) => j.plans().find((p) => p.countryId === countryId)?.plannedDate;

test('a Plan’s Planned date survives reopening the app, and can be taken off again', () => {
  const db = memoryDatabase();
  const j = openJournal({ db, atlas });
  j.mark(japan, 'wish');
  j.setPlannedDate('392', '2027-04');
  assert.equal(plannedDate(openJournal({ db, atlas }), '392'), '2027-04');
  j.setPlannedDate('392', null);
  assert.equal(plannedDate(openJournal({ db, atlas }), '392'), null);
});

test('a Plan marked Visited takes its Planned date as Visit date, and undo gives the Planned date back', () => {
  const j = journal(new Date(2026, 9, 18));
  j.mark(japan, 'wish');
  j.setPlannedDate('392', '2026-04');
  j.mark(japan, 'visited');
  assert.equal(j.place(japan)?.visitDate, '2026-04');
  assert.equal(j.place(japan)?.plannedDate, null);
  j.undo();
  assert.equal(j.place(japan)?.mark, 'wish');
  assert.equal(j.place(japan)?.visitDate, null);
  assert.equal(plannedDate(j, '392'), '2026-04');
});

test('a Plan marked Visited before its Planned date is dated the current month', () => {
  const j = journal(new Date(2026, 9, 18));
  j.mark(japan, 'wish');
  j.setPlannedDate('392', '2027-04');
  j.mark(japan, 'visited');
  assert.equal(j.place(japan)?.visitDate, '2026-10');
});

const okinawa = { level: 'island', id: 'i-okinawa' } as const;

test('a Country that is a Plan through its Island only is kept in the Journal for its Planned date, without a row of its own', () => {
  const db = memoryDatabase();
  const j = openJournal({ db, atlas });
  j.mark(okinawa, 'wish');
  assert.equal(j.status(japan), 'unexplored');
  j.setPlannedDate('392', '2027-04');
  const reopened = openJournal({ db, atlas });
  assert.equal(plannedDate(reopened, '392'), '2027-04');
  assert.deepEqual(listed(reopened), ['392: island:i-okinawa']);
});

test('a Country that stops being a Plan loses its Planned date, and undo gives it back', () => {
  const j = journal();
  j.mark(okinawa, 'wish');
  j.setPlannedDate('392', '2027-04');
  j.mark(okinawa, 'visited');
  assert.equal(plannedDate(j, '392'), undefined);
  assert.equal(j.place(japan), null);
  j.undo();
  assert.equal(plannedDate(j, '392'), '2027-04');
});

/** The Itinerary of a Country's Plan, as « level:id » keys in order. */
const itinerary = (j: Journal, countryId: string) => j.itinerary(countryId).map((p) => `${p.level}:${p.id}`);

test('the Itinerary lists a Plan’s Places marked Wish in the order they were wished, the Country aside', () => {
  const j = journal();
  j.mark(japan, 'wish');
  j.mark(kyoto, 'wish');
  j.mark(okinawa, 'wish');
  j.mark(kanto, 'wish');
  j.mark(france, 'wish');
  assert.deepEqual(itinerary(j, '392'), [`city:${kyoto.id}`, 'island:i-okinawa', 'region:kanto']);
  assert.deepEqual(itinerary(j, '250'), []);
});

test('a stop moved by hand keeps its place in the Itinerary after reopening the app', () => {
  const db = memoryDatabase();
  const j = openJournal({ db, atlas });
  j.mark(kyoto, 'wish');
  j.mark(okinawa, 'wish');
  j.mark(kanto, 'wish');
  j.moveStop(kanto, 0);
  assert.deepEqual(itinerary(openJournal({ db, atlas }), '392'), ['region:kanto', `city:${kyoto.id}`, 'island:i-okinawa']);
});

test('a stop no longer marked Wish leaves the Itinerary, and comes back last once wished again', () => {
  const j = journal();
  j.mark(kyoto, 'wish');
  j.mark(okinawa, 'wish');
  j.mark(kanto, 'wish');
  j.mark(kyoto, 'visited');
  assert.deepEqual(itinerary(j, '392'), ['island:i-okinawa', 'region:kanto']);
  j.mark(kyoto, 'wish');
  assert.deepEqual(itinerary(j, '392'), ['island:i-okinawa', 'region:kanto', `city:${kyoto.id}`]);
});

test('undoing a stop’s change of Mark gives it back its place in the Itinerary', () => {
  const j = journal();
  j.mark(kyoto, 'wish');
  j.mark(okinawa, 'wish');
  j.mark(kanto, 'wish');
  j.mark(kyoto, null);
  j.undo();
  assert.deepEqual(itinerary(j, '392'), [`city:${kyoto.id}`, 'island:i-okinawa', 'region:kanto']);
});

const portugal = { level: 'country', id: '620' } as const;
const planIds = (j: Journal) => j.plans().map((p) => p.countryId);

test('the Plans come in the order they became Plans, the Country of a Wish Island too', () => {
  const j = journal();
  j.mark(france, 'wish');
  j.mark(okinawa, 'wish');
  j.mark(portugal, 'wish');
  j.mark(japan, 'wish');
  assert.deepEqual(planIds(j), ['250', '392', '620']);
});

test('Plans reordered by hand take the places they held among the others, and keep them after reopening the app', () => {
  const db = memoryDatabase();
  const j = openJournal({ db, atlas });
  j.mark(france, 'wish');
  j.mark(okinawa, 'wish');
  j.mark(portugal, 'wish');
  j.orderPlans(['620', '250']);
  assert.deepEqual(planIds(openJournal({ db, atlas })), ['620', '392', '250']);
});

test('a Country that stops being a Plan, then is one again, comes last', () => {
  const j = journal();
  j.mark(france, 'wish');
  j.mark(okinawa, 'wish');
  j.mark(portugal, 'wish');
  j.mark(france, null);
  j.mark(france, 'wish');
  assert.deepEqual(planIds(j), ['392', '620', '250']);
  j.mark(france, null);
  j.undo();
  assert.deepEqual(planIds(j), ['392', '620', '250']);
});

test('undo gives back only what the change of Mark took: a Planned date set or Plans reordered since stay', () => {
  const j = journal();
  j.mark(france, 'wish');
  j.mark(japan, 'wish');
  j.setPlannedDate('392', '2027-04');
  j.mark(japan, 'visited');
  j.mark(okinawa, 'wish');
  j.setPlannedDate('392', '2028-01');
  j.orderPlans(['392', '250']);
  j.undo();
  assert.equal(plannedDate(j, '392'), undefined);
  j.mark(okinawa, 'wish');
  j.setPlannedDate('392', '2028-01');
  j.mark(kanto, 'wish');
  j.setPlannedDate('392', '2029-06');
  j.orderPlans(['392', '250']);
  j.undo();
  assert.equal(plannedDate(j, '392'), '2029-06');
  assert.deepEqual(planIds(j), ['392', '250']);
});

test('Plans reordered with a Country given twice are refused', () => {
  const j = journal();
  j.mark(france, 'wish');
  j.mark(japan, 'wish');
  assert.throws(() => j.orderPlans(['392', '392', '250']));
  assert.deepEqual(planIds(j), ['250', '392']);
});

test('only a Plan has a Planned date to set', () => {
  const j = journal();
  j.mark(france, 'visited');
  assert.throws(() => j.setPlannedDate('250', '2027-04'));
  j.mark(france, 'wish');
  assert.throws(() => j.setPlannedDate('250', '2027-13'));
});

test('clearing a Country takes its Mark, Note, Todos and Photos with their files, and survives reopening the app', async () => {
  const files = memoryPhotoFiles();
  const db = memoryDatabase();
  const j = openJournal({ db, atlas, files });
  j.mark(france, 'visited');
  j.writeNote(france, 'Sarlat au printemps');
  j.addTodo(france, 'Goûter le cassoulet');
  await j.addPhotos(france, ['sarlat.heic']);
  j.clear(france);
  for (const opened of [j, openJournal({ db, atlas })]) {
    assert.equal(opened.status(france), 'unexplored');
    assert.equal(opened.place(france), null);
    assert.deepEqual(opened.todos(france), []);
    assert.deepEqual(opened.photos(france), []);
  }
  assert.deepEqual(files.held(), []);
});

test('clearing a Country or a Region leaves the Places inside it untouched, its Status now theirs', async () => {
  const files = memoryPhotoFiles();
  const j = openJournal({ db: memoryDatabase(), atlas, files });
  j.mark(japan, 'wish');
  j.mark(kansai, 'visited');
  j.writeNote(kansai, 'Temples');
  j.mark(kyoto, 'visited');
  const [photo] = await j.addPhotos(kyoto, ['kinkakuji.heic']);
  j.clear(japan);
  assert.equal(j.place(japan)?.mark ?? null, null);
  assert.equal(j.status(japan), 'visited');
  assert.equal(j.place(kansai)?.note, 'Temples');
  j.clear(kansai);
  assert.equal(j.status(kansai), 'visited');
  assert.deepEqual(j.via(japan), [kansai]);
  assert.equal(j.status(kyoto), 'visited');
  assert.deepEqual(j.photos(kyoto), [photo]);
  assert.deepEqual(files.held().sort(), [photo.file, photo.thumbnail].sort());
});

test('a Cover photo chosen among those cleared goes back to the first Photo left', async () => {
  const j = openJournal({ db: memoryDatabase(), atlas, files: memoryPhotoFiles() });
  const [temple] = await j.addPhotos(kansai, ['temple.heic']);
  const [castle] = await j.addPhotos(kyoto, ['castle.heic']);
  j.setCoverPhoto(japan, temple.id);
  j.clear(kansai);
  assert.equal(j.coverPhoto(japan)?.id, castle.id);
});

test('a Country cleared but still a Plan through its Regions keeps its Planned date; one no longer a Plan loses it', () => {
  const j = journal();
  j.mark(japan, 'wish');
  j.mark(kansai, 'wish');
  j.setPlannedDate('392', '2027-04');
  j.clear(japan);
  assert.equal(plannedDate(j, '392'), '2027-04');
  assert.deepEqual(itinerary(j, '392'), ['region:kansai']);
  j.clear(kansai);
  assert.deepEqual(j.plans(), []);
  assert.equal(j.place(japan), null);
});

test('a Clear cannot be undone, nor the change of Mark it took', () => {
  const j = journal();
  j.mark(france, 'visited');
  j.clear(france);
  assert.equal(j.undo(), null);
  assert.equal(j.status(france), 'unexplored');
});

test('a Clear leaves the undo of another Place’s change of Mark', () => {
  const j = journal();
  j.mark(japan, 'visited');
  j.writeNote(france, 'Sarlat');
  j.clear(france);
  assert.deepEqual(j.undo(), japan);
  assert.equal(j.status(japan), 'unexplored');
});

test('a Region or an Island cleared leaves the Itinerary, and a Country’s Cover photo chosen inside it stays chosen', async () => {
  const j = openJournal({ db: memoryDatabase(), atlas, files: memoryPhotoFiles() });
  j.mark(okinawa, 'wish');
  j.mark(kansai, 'wish');
  await j.addPhotos(japan, ['fuji.heic']);
  await j.addPhotos(kansai, ['temple.heic']);
  const [castle] = await j.addPhotos(kyoto, ['castle.heic']);
  j.setCoverPhoto(japan, castle.id);
  j.clear(okinawa);
  assert.deepEqual(itinerary(j, '392'), ['region:kansai']);
  j.clear(japan);
  assert.equal(j.coverPhoto(japan)?.id, castle.id);
});

test('a Deleted City is gone from the Journal with its Note, Todos and Photos and their files, after reopening the app too', async () => {
  const files = memoryPhotoFiles();
  const db = memoryDatabase();
  const j = openJournal({ db, atlas, files });
  j.mark(kyoto, 'visited');
  j.writeNote(kyoto, 'Le Pavillon d’or');
  j.addTodo(kyoto, 'Fushimi Inari à l’aube');
  await j.addPhotos(kyoto, ['kinkakuji.heic']);
  j.deleteCity(kyoto.id);
  for (const opened of [j, openJournal({ db, atlas })]) {
    assert.equal(opened.city(kyoto.id), null);
    assert.equal(opened.place(kyoto), null);
    assert.deepEqual(opened.todos(kyoto), []);
    assert.deepEqual(opened.photos(kyoto), []);
    assert.deepEqual(opened.byCountry(), []);
    assert.equal(opened.status(japan), 'unexplored');
  }
  assert.deepEqual(files.held(), []);
  assert.equal(j.undo(), null);
});

test('Deleting a City leaves its Region and Country as they were, the Plan of its Country going with its last Wish', async () => {
  const j = openJournal({ db: memoryDatabase(), atlas, files: memoryPhotoFiles() });
  j.mark(kansai, 'visited');
  const [temple] = await j.addPhotos(kansai, ['temple.heic']);
  j.mark(kyoto, 'wish');
  j.setPlannedDate('392', '2027-04');
  j.deleteCity(kyoto.id);
  assert.equal(j.status(japan), 'visited');
  assert.deepEqual(j.photosInside(japan), [temple]);
  assert.deepEqual(j.plans(), []);
});

test('a Custom City can be Deleted too', async () => {
  const j = journal();
  const city = await j.createCity('Chez Mamie', { lon: 2, lat: 46 });
  j.deleteCity(city!.id);
  assert.deepEqual(j.cities(), []);
});

test('only a City is Deleted, and only a Country, an Island or a Region Cleared', () => {
  const j = journal();
  j.mark(kyoto, 'visited');
  assert.throws(() => j.clear(kyoto));
  assert.throws(() => j.deleteCity('392'));
  assert.equal(j.status(kyoto), 'visited');
});

test('the Profile counts the Countries Visited', () => {
  const j = journal();
  j.mark(france, 'visited');
  j.mark(japan, 'wish');
  assert.deepEqual(j.visitedCounts(), { countries: 1, regions: 0, islands: 0, cities: 0 });
});

test('the Profile counts by Status: a City Visited makes its Region and its Country Visited', () => {
  const j = journal();
  j.mark(kyoto, 'visited');
  assert.deepEqual(j.visitedCounts(), { countries: 1, regions: 1, islands: 0, cities: 1 });
});

test('the Profile counts a Place Visited once, however many Places inside it are', () => {
  const j = journal();
  j.mark(japan, 'visited');
  j.mark(kansai, 'visited');
  j.mark(kanto, 'visited');
  j.mark(kyoto, 'visited');
  assert.deepEqual(j.visitedCounts(), { countries: 1, regions: 2, islands: 0, cities: 1 });
});

test('the Profile counts an Island Visited by its City, which does not make its Country Visited', () => {
  const j = journal();
  j.mark(naha, 'visited');
  assert.deepEqual(j.visitedCounts(), { countries: 0, regions: 0, islands: 1, cities: 1 });
});

test('the Profile counts neither Wish nor Places marked Visited no more', () => {
  const j = journal();
  j.mark(kyoto, 'wish');
  j.mark(kansai, 'visited');
  j.mark(kansai, null);
  assert.deepEqual(j.visitedCounts(), { countries: 0, regions: 0, islands: 0, cities: 0 });
});
