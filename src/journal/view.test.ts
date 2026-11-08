/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import type { PlaceRef } from './journal.ts';
import { journalView, wishlistView } from './view.ts';

const NAMES: Record<string, string> = {
  'country:250': 'France',
  'country:392': 'Japon',
  'country:31': 'Équateur',
  'region:kansai': 'Kansai',
  'island:i-okinawa': 'Okinawa',
  'city:kyoto': 'Kyōto',
  'city:arles': 'Arles',
  'city:quito': 'Quito',
};
const NOTES: Record<string, string> = {
  'city:kyoto': 'Le Pavillon d’or, au petit matin',
  'city:arles': 'Les arènes',
};
const key = (place: PlaceRef) => `${place.level}:${place.id}`;
const lookup = { nameOf: (place: PlaceRef) => NAMES[key(place)], noteOf: (place: PlaceRef) => NOTES[key(place)] ?? '' };

const ref = (k: string): PlaceRef => {
  const [level, id] = k.split(':');
  return { level: level as PlaceRef['level'], id };
};
const listed = [
  { countryId: '392', places: ['city:kyoto', 'region:kansai', 'country:392', 'island:i-okinawa'].map(ref) },
  { countryId: '31', places: ['city:quito'].map(ref) },
  { countryId: '250', places: ['city:arles', 'country:250'].map(ref) },
];

/** The Journal view as « Country: Place, Place » lines. */
const shown = (query?: string) =>
  journalView(listed, lookup, query).map(({ name, rows }) => `${name}: ${rows.map((row) => row.name).join(', ')}`);

test('the Journal view lists its Countries by name, each with its own row first and the others by name', () => {
  assert.deepEqual(shown(), ['Équateur: Quito', 'France: France, Arles', 'Japon: Japon, Kansai, Kyōto, Okinawa']);
});

test('a search keeps the Places whose name holds it, accents and case aside, and only their Countries', () => {
  assert.deepEqual(shown('KYO'), ['Japon: Kyōto']);
  assert.deepEqual(shown('  '), shown());
  assert.deepEqual(shown('Lisbonne'), []);
});

test('a search for a Country keeps all of its Places, though it has no row of its own', () => {
  assert.deepEqual(shown('equateur'), ['Équateur: Quito']);
  assert.deepEqual(shown('Jap'), ['Japon: Japon, Kansai, Kyōto, Okinawa']);
});

const wishLookup = {
  ...lookup,
  whereOf: (place: PlaceRef) => (place.level === 'country' ? '' : place.id === 'quito' ? 'Équateur' : 'Japon'),
};

test('the Wishlist view lists its Places by name, each with the Country it is in and the first line of its Note', () => {
  const view = wishlistView(['city:quito', 'country:250', 'city:kyoto', 'region:kansai'].map(ref), wishLookup);
  assert.deepEqual(
    view.rows.map(({ name, meta }) => `${name} — ${meta}`),
    ['France — Épinglé', 'Kansai — Japon', 'Kyōto — Japon · Le Pavillon d’or, au petit matin', 'Quito — Équateur'],
  );
});

test('the Wishlist view counts its destinations', () => {
  assert.equal(wishlistView(['country:250', 'city:kyoto'].map(ref), wishLookup).count, '2 destinations épinglées');
  assert.equal(wishlistView([ref('city:arles')], wishLookup).count, '1 destination épinglée');
});

test('the Wishlist view shows only the first line of a Note', () => {
  const noteOf = (place: PlaceRef) => (place.id === 'arles' ? '\nLes arènes\nPuis la Camargue' : '');
  const [row] = wishlistView([ref('city:arles')], { ...wishLookup, noteOf, whereOf: () => 'France' }).rows;
  assert.equal(row.meta, 'France · Les arènes');
});

test('a search finds a Place by the words of its Note', () => {
  assert.deepEqual(shown('pavillon d or'), ['Japon: Kyōto']);
  assert.deepEqual(shown('arenes'), ['France: Arles']);
});
