/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { statsLine } from './stats.ts';

test('the Profile tells how many Places are Visited, of each kind', () => {
  assert.equal(statsLine({ countries: 16, regions: 23, cities: 41 }), '16 pays et territoires · 23 régions · 41 villes visités');
});

test('one of a kind, or none, is in the singular', () => {
  assert.equal(statsLine({ countries: 1, regions: 1, cities: 0 }), '1 pays ou territoire · 1 région · 0 ville visités');
});
