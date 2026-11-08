/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import type { PlaceRef } from '../journal/journal.ts';
import { carnetGroups } from './carnet.ts';

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
const journal = [
  { countryId: '392', places: ['city:kyoto', 'region:kansai', 'country:392', 'island:i-okinawa'].map(ref) },
  { countryId: '31', places: ['city:quito'].map(ref) },
  { countryId: '250', places: ['city:arles', 'country:250'].map(ref) },
];

/** The Carnet as « Country: Place, Place » lines. */
const shown = (query?: string) =>
  carnetGroups(journal, lookup, query).map(({ name, rows }) => `${name}: ${rows.map((row) => row.name).join(', ')}`);

test('the Carnet lists its Countries by name, each with its own row first and the others by name', () => {
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

test('a search finds a Place by the words of its Note', () => {
  assert.deepEqual(shown('pavillon d or'), ['Japon: Kyōto']);
  assert.deepEqual(shown('arenes'), ['France: Arles']);
});
