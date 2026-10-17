/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { centerOn, coast, drag, pinch, release, zoomIn, zoomOut, type Spin, type View } from './camera.ts';

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

test('recentring faces the point at zoom 1, turning the short way across the antimeridian', () => {
  const view = centerOn({ lon: 170, lat: 10, zoom: 5 }, { lon: -170, lat: 35 });
  assert.ok(Math.abs(view.lon - 190) < 1e-9, `lon ${view.lon}`);
  assert.deepEqual({ lat: view.lat, zoom: view.zoom }, { lat: 35, zoom: 1 });
});

test('recentring on a point beyond 60° N stops at the tilt limit', () => {
  const view = centerOn(europe, { lon: 18.9, lat: 69.6 });
  assert.ok(Math.abs(view.lon - 18.9) < 1e-9, `lon ${view.lon}`);
  assert.deepEqual({ lat: view.lat, zoom: view.zoom }, { lat: 60, zoom: 1 });
});
