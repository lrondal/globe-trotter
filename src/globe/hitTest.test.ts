/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { decodeCountries, type CountriesData } from '../atlas/countries.ts';
import type { View } from './camera.ts';
import { countryAt } from './hitTest.ts';
import { DETAIL, frameFor } from './projection.ts';

const data: CountriesData = JSON.parse(readFileSync(new URL('../../assets/data/countries.json', import.meta.url), 'utf8'));
const { countries, geometry } = decodeCountries(data);
const screen = { width: 402, height: 790 };

/** The Country (its id) under a tap `dx`, `dy` points away from the centre of the globe. */
function tap(view: View, dx = 0, dy = 0) {
  const frame = frameFor(view, screen);
  const index = countryAt(geometry, frame, DETAIL.standard, frame.cx + dx, frame.cy + dy);
  return index < 0 ? null : countries[index].id;
}

test('a tap inside a Country finds it, holes included', () => {
  assert.equal(tap({ lon: 2.5, lat: 46.5, zoom: 1 }), '250');
  // Lesotho sits in a hole of South Africa.
  assert.equal(tap({ lon: 28.2, lat: -29.6, zoom: 4 }), '426');
  assert.equal(tap({ lon: 25, lat: -30, zoom: 4 }), '710');
  // Russia spans the antimeridian.
  assert.equal(tap({ lon: 175, lat: 66, zoom: 2 }), '643');
});

test('a tap on open ocean or off the globe finds nothing', () => {
  assert.equal(tap({ lon: -35, lat: 30, zoom: 1 }), null);
  assert.equal(tap({ lon: -35, lat: 30, zoom: 1 }, 0, -380), null);
});

test('a micro-country is found by a tap a few points off it, in the sea', () => {
  // Malta, a few pixels wide: a tap 0.7° south-east of it, in the sea halfway to nowhere
  // else (Sicily is twice as far, Libya four times).
  assert.equal(tap({ lon: 14.4, lat: 35.9, zoom: 3 }, 6, 6), '470');
  // Grenada, among the small Caribbean islands: a tap 0.5° west of it.
  assert.equal(tap({ lon: -61.68, lat: 12.12, zoom: 4 }, -8, 0), '308');
});

test('a tap far from any coast finds nothing, even near a micro-country', () => {
  // 4.5° east of Grenada, 2.4° from Barbados.
  assert.equal(tap({ lon: -61.68, lat: 12.12, zoom: 4 }, 60, 0), null);
});
