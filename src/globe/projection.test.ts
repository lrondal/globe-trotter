/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { decodeCountries } from '../atlas/countries.ts';
import { MAX_ZOOM } from './camera.ts';
import { DETAIL, discRadius, frameFor, projectPoint, traceCountries, traceGraticule } from './projection.ts';

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

/** Records every coordinate traced, as Skia gets them: in float32. */
function recorder() {
  const xs: number[] = [];
  const ys: number[] = [];
  const add = (...c: number[]) => {
    for (let i = 0; i + 1 < c.length; i += 2) {
      xs.push(c[i]);
      ys.push(c[i + 1]);
    }
  };
  return {
    xs,
    ys,
    sink: { moveTo: add, lineTo: add, conicTo: (x1: number, y1: number, x2: number, y2: number) => add(x1, y1, x2, y2), close() {} },
  };
}

// Zoomed all the way in on the Vatican, and where the 10° E meridian meets the 40° N parallel.
const deepViews = [
  { lon: 12.45, lat: 41.9, zoom: MAX_ZOOM },
  { lon: 10.0004, lat: 40.0003, zoom: MAX_ZOOM },
];

test('zoomed all the way in, every point given to Skia stays near the screen, where float32 is precise', () => {
  const { geometry } = decodeCountries(JSON.parse(readFileSync(new URL('../../assets/data/countries.json', import.meta.url), 'utf8')));
  for (const view of deepViews) {
    const frame = frameFor(view, viewport);
    const { xs, ys, sink } = recorder();
    traceCountries(geometry, frame, DETAIL.standard, sink);
    traceGraticule(frame, sink);
    assert.ok(xs.length > 0, 'something is drawn');
    for (const [values, size] of [[xs, viewport.width], [ys, viewport.height]] as const) {
      const worst = Math.max(...values.map((c) => Math.max(-c, c - size)));
      assert.ok(worst < 2 * viewport.height, `${worst} pt off screen`);
    }
  }
});

test('zoomed all the way in, the Vatican and the hole Italy leaves for it are drawn through the very same points', () => {
  const { geometry } = decodeCountries(JSON.parse(readFileSync(new URL('../../assets/data/countries.json', import.meta.url), 'utf8')));
  const rings: string[][] = [];
  const add = (x: number, y: number) => void rings.at(-1)!.push(`${Math.fround(x)},${Math.fround(y)}`);
  const sink = { moveTo: (x: number, y: number) => (rings.push([]), add(x, y)), lineTo: add, conicTo() {}, close() {} };
  traceCountries(geometry, frameFor(deepViews[0], viewport), DETAIL.standard, sink);
  // The rings drawn whole on screen, not cut by its edges: the Vatican and Italy's hole.
  const whole = rings.filter((ring) => ring.every((p) => p.split(',').every((c, k) => +c > 0 && +c < [402, 700][k])));
  assert.equal(whole.length, 2);
  assert.deepEqual([...whole[0]].sort(), [...whole[1]].sort());
});

test('the globe disc is drawn at its true radius while its rim shows', () => {
  assert.equal(discRadius(frameFor({ lon: 0, lat: 0, zoom: 1 }, viewport)), 196.98);
  assert.equal(discRadius(frameFor({ lon: 0, lat: 0, zoom: 2 }, viewport, 120)), 2 * 196.98);
});

test('zoomed all the way in, the globe disc still covers the screen with a radius float32 holds exactly', () => {
  const frame = frameFor(deepViews[0], viewport, 150);
  const r = discRadius(frame);
  assert.ok(r < 2 * viewport.height, `radius ${r}`);
  for (const [x, y] of [[0, 0], [viewport.width, 0], [0, viewport.height], [viewport.width, viewport.height]]) {
    assert.ok(Math.hypot(x - frame.cx, y - frame.cy) < r - 4, `corner (${x}, ${y}) uncovered`);
  }
});

test('zoomed all the way in, the graticule line crossing the screen is still drawn where it belongs', () => {
  const frame = frameFor(deepViews[1], viewport);
  const { xs, ys, sink } = recorder();
  traceGraticule(frame, sink);
  // The 10° E meridian, a few points left of the centre: a vertical line across the screen.
  const meridian = projectPoint(frame, { lon: 10, lat: 40.0003 }).x;
  const onIt = xs.map((x, i) => ({ x, y: ys[i] })).filter(({ x }) => Math.abs(x - meridian) < 0.01);
  assert.ok(onIt.some(({ y }) => y < 0) && onIt.some(({ y }) => y > viewport.height), `${onIt.length} points on it`);
});
