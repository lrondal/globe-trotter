/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { openJournal, type PlaceRef } from './journal.ts';
import { memoryDatabase } from './memoryDatabase.ts';

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
