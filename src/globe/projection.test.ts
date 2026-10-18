/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { decodeCountries } from '../atlas/countries.ts';
import { frameFor, projectPoint, traceCountries, type PathSink } from './projection.ts';

// A 402 × 700 pt globe screen: radius 196.98 at zoom 1, centred at (201, 398).
const viewport = { width: 402, height: 700 };

function near(actual: { x: number; y: number }, x: number, y: number) {
  assert.ok(Math.abs(actual.x - x) < 1e-9 && Math.abs(actual.y - y) < 1e-9, `(${actual.x}, ${actual.y})`);
}

test('the point the view is centred on is drawn at the centre of the globe', () => {
  const at = projectPoint(frameFor({ lon: 139.7, lat: 35.7, zoom: 3 }, viewport), { lon: 139.7, lat: 35.7 });
  near(at, 201, 398);
  assert.equal(at.visible, true);
});

test('a point 90° east on the equator sits on the right edge of the globe, scaled by the zoom', () => {
  const at = projectPoint(frameFor({ lon: 0, lat: 0, zoom: 2 }, viewport), { lon: 90, lat: 0 });
  near(at, 201 + 2 * 196.98, 398);
});

test('a point 30° north of the centre is drawn above it', () => {
  const at = projectPoint(frameFor({ lon: 0, lat: 0, zoom: 1 }, viewport), { lon: 0, lat: 30 });
  near(at, 201, 398 - 196.98 / 2);
});

test('a point on the far side of the globe is hidden', () => {
  assert.equal(projectPoint(frameFor({ lon: 10, lat: 45, zoom: 1 }, viewport), { lon: -170, lat: -45 }).visible, false);
});

/** A 5° square Country with its south-west corner at (lon, lat), as one arc in 1e-4 degrees. */
const square = (lon: number, lat: number) => [lon * 1e4, lat * 1e4, 0, 5e4, 0, 0, 0, 5e4, 0, -5e4, 0, 0, 0, -5e4, 0];

/** Counts the rings traced into it. */
function ringCounter() {
  const sink = { rings: 0, moveTo: () => sink.rings++, lineTo() {}, conicTo() {}, close() {} };
  return sink satisfies PathSink;
}

test('each Country is traced into the path of its layer, so it takes the colour of that layer', () => {
  const { geometry } = decodeCountries({
    countries: [
      { id: '250', name: 'France', polygons: [[[0]]] },
      { id: '724', name: 'Espagne', polygons: [[[1]]] },
      { id: '620', name: 'Portugal', polygons: [[[2]]] },
    ],
    arcs: [square(0, 0), square(-10, 0), square(-20, 0)],
  });
  const sinks = [ringCounter(), ringCounter(), ringCounter()];
  traceCountries(geometry, frameFor({ lon: -10, lat: 0, zoom: 1 }, viewport), 0.25, sinks, [2, 0, 2]);
  assert.deepEqual(
    sinks.map((sink) => sink.rings),
    [1, 0, 2],
  );
});
