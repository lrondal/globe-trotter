/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { frameFor, projectPoint } from './projection.ts';

// A 402 × 700 pt globe screen: radius 196.98 at zoom 1, centred at (201, 398).
const viewport = { width: 402, height: 700 };

function near(actual: { x: number; y: number }, x: number, y: number) {
  assert.ok(Math.abs(actual.x - x) < 1e-9 && Math.abs(actual.y - y) < 1e-9, `(${actual.x}, ${actual.y})`);
}

test('the point the view is centred on is drawn at the centre of the globe', () => {
  const at = projectPoint(frameFor({ lon: 139.7, lat: 35.7, zoom: 3 }, viewport), 139.7, 35.7);
  near(at, 201, 398);
  assert.equal(at.visible, true);
});

test('a point 90° east on the equator sits on the right edge of the globe, scaled by the zoom', () => {
  const at = projectPoint(frameFor({ lon: 0, lat: 0, zoom: 2 }, viewport), 90, 0);
  near(at, 201 + 2 * 196.98, 398);
});

test('a point 30° north of the centre is drawn above it', () => {
  const at = projectPoint(frameFor({ lon: 0, lat: 0, zoom: 1 }, viewport), 0, 30);
  near(at, 201, 398 - 196.98 / 2);
});

test('a point on the far side of the globe is hidden', () => {
  assert.equal(projectPoint(frameFor({ lon: 10, lat: 45, zoom: 1 }, viewport), -170, -45).visible, false);
});
