/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { poleOfInaccessibility } from './anchor.ts';

const near = ([lon, lat]: [number, number], [lon0, lat0]: [number, number], within: number) =>
  assert.ok(Math.abs(lon - lon0) <= within && Math.abs(lat - lat0) <= within, `${lon} ${lat}, not ${lon0} ${lat0}`);

// Outer rings clockwise, holes anticlockwise, as d3 winds them.

test('the pole of inaccessibility of a square is its centre', () => {
  const square: [number, number][] = [[0, 0], [0, 4], [4, 4], [4, 0], [0, 0]];
  near(poleOfInaccessibility([square]), [2, 2], 0.05);
});

test('the pole of inaccessibility of a C stays on land, where its centroid would fall in the bay', () => {
  // A C open to the east: the bay is 1° to 5° E, 1° to 5° N; the land is the 1°-wide band around it.
  const c: [number, number][] = [[0, 0], [0, 6], [6, 6], [6, 5], [1, 5], [1, 1], [6, 1], [6, 0], [0, 0]];
  const [lon, lat] = poleOfInaccessibility([c]);
  const inBay = lon > 1 && lon < 6 && lat > 1 && lat < 5;
  assert.ok(!inBay, `${lon} ${lat} is in the bay`);
  assert.ok(lon >= 0 && lon <= 6 && lat >= 0 && lat <= 6);
});

test('a hole is not land: the pole moves off a lake', () => {
  const outer: [number, number][] = [[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]];
  const lake: [number, number][] = [[3, 3], [7, 3], [7, 7], [3, 7], [3, 3]];
  const [lon, lat] = poleOfInaccessibility([outer, lake]);
  assert.ok(!(lon > 3 && lon < 7 && lat > 3 && lat < 7), `${lon} ${lat} is in the lake`);
});

test('a polygon across the antimeridian has its pole on it, not on the far side of the globe', () => {
  const across: [number, number][] = [[178, -2], [178, 2], [-178, 2], [-178, -2], [178, -2]];
  const [lon, lat] = poleOfInaccessibility([across]);
  assert.ok(Math.abs(Math.abs(lon) - 180) < 0.1 && Math.abs(lat) < 0.1, `${lon} ${lat}`);
});

test('a wide polygon far north is measured in kilometres, not in degrees of longitude', () => {
  // 20° of longitude by 6° of latitude at 70° N: about 760 by 670 km, so its pole is near the
  // middle either way; but a band 2° high would be wider in degrees than it is in kilometres.
  const band: [number, number][] = [[0, 70], [0, 76], [20, 76], [20, 70], [0, 70]];
  near(poleOfInaccessibility([band]), [10, 73], 0.5);
});

test('a polygon around a pole has its pole of inaccessibility near the pole', () => {
  // Wound clockwise seen from above: around the South Pole, west to east.
  const cap: [number, number][] = [-180, -90, 0, 90, 180].map((lon) => [lon, -70]);
  const [, lat] = poleOfInaccessibility([cap]);
  assert.ok(lat < -85, `${lat}`);
});
