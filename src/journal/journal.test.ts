/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { openJournal } from './journal.ts';
import { memoryDatabase } from './memoryDatabase.ts';

const atlas = {
  places: ['250', '392', '620', 'x-kosovo'].map((id) => ({ level: 'country', id }) as const),
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
  const j = openJournal({ db: memoryDatabase(), atlas: { places } });
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
