/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { sheetChange } from './crossfade.ts';

const japan = { id: 'country:JP', country: 3 };
const kansai = { id: 'region:JP-KS', country: 3 };

test('a Region tapped in the selected Country fades in over it', () => {
  assert.equal(sheetChange(japan, kansai), 'fade');
});

test('another Country tapped replaces the sheet at once, as it slides to half height', () => {
  assert.equal(sheetChange(kansai, { id: 'country:FR', country: 7 }), 'swap');
});

test('a sheet opening shows its Place at once, even the Country it last showed a Region of', () => {
  assert.equal(sheetChange(null, japan), 'swap');
});

test('the Place shown, marked or renamed, updates in place', () => {
  assert.equal(sheetChange(kansai, { ...kansai }), 'update');
});

test('a sheet closing keeps its last Place while it slides away', () => {
  assert.equal(sheetChange(kansai, null), 'keep');
});

test('another Region of the same Country fades in over the first', () => {
  assert.equal(sheetChange(kansai, { id: 'region:JP-KT', country: 3 }), 'fade');
});
