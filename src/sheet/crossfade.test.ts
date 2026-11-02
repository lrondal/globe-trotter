/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { sheetChange } from './crossfade.ts';

const japan = { ref: { level: 'country' as const, id: 'JP' }, country: 3 };
const kansai = { ref: { level: 'region' as const, id: 'JP-KS' }, country: 3 };

test('a Region tapped in the selected Country fades in over it', () => {
  assert.equal(sheetChange(japan, kansai), 'fade');
});

test('another Region of the same Country fades in over the first', () => {
  assert.equal(sheetChange(kansai, { ref: { level: 'region', id: 'JP-KT' }, country: 3 }), 'fade');
});

test('another Country tapped replaces the sheet at once, as it slides to half height', () => {
  assert.equal(sheetChange(kansai, { ref: { level: 'country', id: 'FR' }, country: 7 }), 'swap');
});

test('a City of the same Country, flown to as the sheet slides to half height, shows at once', () => {
  assert.equal(sheetChange(kansai, { ref: { level: 'city', id: 'kyoto' }, country: 3 }), 'swap');
});

test('a Region going back to its Country fades back to the Country', () => {
  assert.equal(sheetChange(kansai, japan), 'fade');
});

test('a City going back to its Country shows the Country at once', () => {
  assert.equal(sheetChange({ ref: { level: 'city', id: 'kyoto' }, country: 3 }, japan), 'swap');
});

test('a sheet opening shows its Place at once, even the Country it last showed a Region of', () => {
  assert.equal(sheetChange(null, japan), 'swap');
});

test('the Place shown, marked or renamed, updates in place', () => {
  assert.equal(sheetChange(kansai, { ref: { ...kansai.ref }, country: 3 }), 'update');
});

test('a sheet closing keeps its last Place while it slides away', () => {
  assert.equal(sheetChange(kansai, null), 'keep');
});
