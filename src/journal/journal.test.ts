/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { openJournal } from './journal.ts';
import { memoryDatabase } from './memoryDatabase.ts';

const atlas = { countries: [{ id: '250' }, { id: '392' }, { id: '620' }, { id: 'x-kosovo' }] };
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

test('Retirer returns a Country to Unexplored', () => {
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

test('Retirer keeps the Note of the Country', () => {
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
