/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { coast, drag, fit, fly, pinch, release, zoomIn, zoomOut, type Shot, type Spin, type View } from './camera.ts';
import { frameFor, TOP_BAND } from './projection.ts';

// A 402 pt wide iPhone: the globe's radius at zoom 1 is 0.49 × 402.
const RADIUS = 196.98;
const europe: View = { lon: 10, lat: 45, zoom: 1 };

test('dragging the globe down far enough never tilts the view past 60° N', () => {
  let view = europe;
  for (let i = 0; i < 50; i++) view = drag(view, 0, 40, RADIUS);
  assert.equal(view.lat, 60);
});

test('dragging by one on-screen globe radius turns the globe 75°, whatever the zoom', () => {
  const zoomed = drag({ lon: 10, lat: 0, zoom: 4 }, -4 * RADIUS, 0, RADIUS);
  assert.ok(Math.abs(zoomed.lon - 85) < 1e-9, `lon ${zoomed.lon}`);
  const tilted = drag({ lon: 10, lat: 0, zoom: 1 }, 0, -RADIUS / 3, RADIUS);
  assert.ok(Math.abs(tilted.lat - -25) < 1e-9, `lat ${tilted.lat}`);
});

test('longitude wraps around the antimeridian', () => {
  const view = drag({ lon: 170, lat: 0, zoom: 1 }, -RADIUS * (40 / 75), 0, RADIUS);
  assert.ok(Math.abs(view.lon - -150) < 1e-9, `lon ${view.lon}`);
});

test('a pinch scales the zoom it started from, between 0.8× and 24×', () => {
  assert.equal(pinch(europe, 2, 1.5).zoom, 3);
  assert.equal(pinch(europe, 2, 100).zoom, 24);
  assert.equal(pinch(europe, 2, 0.01).zoom, 0.8);
});

test('the + and − buttons zoom ×1.6 from the current zoom, staying between 0.8× and 24×', () => {
  assert.ok(Math.abs(zoomIn({ ...europe, zoom: 2 }).zoom - 3.2) < 1e-9);
  assert.ok(Math.abs(zoomOut({ ...europe, zoom: 2 }).zoom - 1.25) < 1e-9);
  let view = europe;
  for (let i = 0; i < 20; i++) view = zoomIn(view);
  assert.equal(view.zoom, 24);
  for (let i = 0; i < 20; i++) view = zoomOut(view);
  assert.equal(view.zoom, 0.8);
  assert.deepEqual({ lon: view.lon, lat: view.lat }, { lon: 10, lat: 45 });
});

/** Lets the globe coast at 60 fps until it stops; returns where it stopped and how many frames it took. */
function coastToRest(view: View, spin: Spin | null) {
  let frames = 0;
  while (spin && frames < 600) {
    ({ view, spin } = coast(view, spin, 1000 / 60));
    frames++;
  }
  return { view, frames, stopped: spin === null };
}

test('after a fling the globe keeps turning the same way, slows down and stops within seconds', () => {
  const flung = { lon: 10, lat: 0, zoom: 1 };
  // Finger flung leftwards at 800 pt/s: the globe turns east.
  const { view, frames, stopped } = coastToRest(flung, release(flung, -800, 0, RADIUS));
  assert.ok(stopped, 'the globe stops');
  assert.ok(frames > 10 && frames < 180, `stopped after ${frames} frames`);
  // 800 pt/s is 304.6 °/s; decaying by e every 325 ms it travels about 99° more.
  assert.ok(view.lon > 100 && view.lon < 130, `coasted to ${view.lon}°`);
  assert.equal(view.lat, 0);
});

test('a fling never tilts the view past 60° S', () => {
  const flung = { lon: 10, lat: 50, zoom: 1 };
  let lowest = Infinity;
  let view = flung;
  let spin: Spin | null = release(flung, 0, -5000, RADIUS);
  while (spin) {
    ({ view, spin } = coast(view, spin, 1000 / 60));
    lowest = Math.min(lowest, view.lat);
  }
  assert.equal(lowest, -60);
});

// The Globe screen of a 402 × 874 pt iPhone above its tab bar, with the sheet half open.
const screen = { width: 402, height: 790 };
const SHEET_TOP = 380;
const BAND = SHEET_TOP - TOP_BAND;

/** Where a point (degrees) lands on screen for a Shot. */
function onScreen(shot: Shot, lon: number, lat: number) {
  const f = frameFor(shot.view, screen, shot.lift);
  const [λ, φ] = [(lon * Math.PI) / 180, (lat * Math.PI) / 180];
  const p = [Math.cos(φ) * Math.cos(λ), Math.cos(φ) * Math.sin(λ), Math.sin(φ)];
  return {
    x: f.cx + f.s * (p[0] * f.ex + p[1] * f.ey + p[2] * f.ez),
    y: f.cy - f.s * (p[0] * f.nx + p[1] * f.ny + p[2] * f.nz),
    s: f.s,
  };
}

test('framing a Place centres it in the band above the sheet and fills 78% of it', () => {
  // Japan: taller than wide once the band is 284 × 402 pt.
  const japan = { lon: 138, lat: 36, width: 0.35, height: 0.4 };
  const shot = fit(japan, screen, SHEET_TOP);
  const centre = onScreen(shot, japan.lon, japan.lat);
  assert.ok(Math.abs(centre.x - 201) < 1e-6, `x ${centre.x}`);
  assert.ok(Math.abs(centre.y - (TOP_BAND + SHEET_TOP) / 2) < 1e-6, `y ${centre.y}`);
  const [top, bottom] = [centre.y - (centre.s * japan.height) / 2, centre.y + (centre.s * japan.height) / 2];
  assert.ok(top > TOP_BAND && bottom < SHEET_TOP, `from ${top} to ${bottom}`);
  assert.ok(Math.abs((bottom - top) / BAND - 0.78) < 1e-6, `fills ${(bottom - top) / BAND}`);
});

test('a wide Place is framed on its width', () => {
  const chile = { lon: -71, lat: -36, width: 1.2, height: 0.2 };
  const centre = onScreen(fit(chile, screen, SHEET_TOP), chile.lon, chile.lat);
  assert.ok(Math.abs((centre.s * chile.width) / screen.width - 0.78) < 1e-6);
});

test('a Place beyond the 60° tilt limit is still framed above the sheet', () => {
  const greenland = { lon: -41, lat: 72, width: 0.3, height: 0.35 };
  const shot = fit(greenland, screen, SHEET_TOP);
  assert.equal(shot.view.lat, 60);
  const centre = onScreen(shot, greenland.lon, greenland.lat);
  assert.ok(Math.abs(centre.y - (TOP_BAND + SHEET_TOP) / 2) < 1e-6, `y ${centre.y}`);
});

test('framing never zooms out past 0.8× nor in past 24×', () => {
  assert.equal(fit({ lon: 100, lat: 60, width: 3, height: 3 }, screen, SHEET_TOP).view.zoom, 0.8);
  assert.equal(fit({ lon: 7.4, lat: 43.7, width: 1e-4, height: 1e-4 }, screen, SHEET_TOP).view.zoom, 24);
});

/** Flies from one Shot to another at 60 fps; returns every Shot drawn and the time taken. */
function flyAll(from: Shot, to: Shot) {
  const shots: Shot[] = [];
  let elapsed = 0;
  for (;;) {
    elapsed += 1000 / 60;
    const step = fly(from, to, elapsed);
    shots.push(step.shot);
    if (step.done) return { shots, elapsed };
  }
}

test('the flight lands on its target in 900 ms', () => {
  const to: Shot = { view: { lon: 138, lat: 36, zoom: 5 }, lift: 120 };
  const { shots, elapsed } = flyAll({ view: europe, lift: 0 }, to);
  assert.ok(elapsed >= 900 && elapsed < 900 + 1000 / 60, `landed after ${elapsed} ms`);
  assert.deepEqual(shots.at(-1), to);
});

test('the flight takes the shortest way in longitude, across the antimeridian', () => {
  // From Japan to Hawaii: 60° east across the antimeridian, not 300° west over Europe.
  const japan: Shot = { view: { lon: 140, lat: 20, zoom: 1 }, lift: 0 };
  const hawaii: Shot = { view: { lon: -160, lat: 20, zoom: 1 }, lift: 0 };
  for (const { view } of flyAll(japan, hawaii).shots) {
    assert.ok(view.lon >= 140 || view.lon <= -160, `passed over ${view.lon}°`);
  }
  const halfway = fly(japan, hawaii, 450).shot.view.lon;
  assert.ok(Math.abs(Math.abs(halfway) - 170) < 1e-9, `halfway at ${halfway}°`);
});

test('the flight eases in and out', () => {
  const { shots } = flyAll({ view: { lon: 0, lat: 0, zoom: 1 }, lift: 0 }, { view: { lon: 90, lat: 0, zoom: 1 }, lift: 0 });
  const steps = shots.map((s, i) => s.view.lon - (i === 0 ? 0 : shots[i - 1].view.lon));
  const middle = steps[Math.floor(steps.length / 2)];
  assert.ok(steps[0] < middle / 5 && steps.at(-1)! < middle / 5, `steps ${steps[0]}, ${middle}, ${steps.at(-1)}`);
});
