/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  centerOn,
  coast,
  drag,
  fit,
  fly,
  holdZoom,
  MAX_ZOOM,
  pinch,
  release,
  zoomIn,
  zoomOut,
  type Shot,
  type Spin,
  type View,
} from './camera.ts';
import { frameFor, globeCenterY, TOP_BAND } from './projection.ts';

// A 402 pt wide iPhone: the globe's radius at zoom 1 is 0.49 × 402.
const RADIUS = 196.98;
const europe: View = { lon: 10, lat: 45, zoom: 1 };
// The Vatican as the Atlas draws it: 1.457e-4 globe radii wide, about 0.93 km.
const vatican = { lon: 12.434, lat: 41.902, width: 1.457e-4, height: 1.67e-4 };

test('dragging the globe down far enough never tilts the view past 60° N', () => {
  let view = europe;
  for (let i = 0; i < 50; i++) view = drag(view, 0, 40, RADIUS);
  assert.equal(view.lat, 60);
});

test('with the whole globe in view, dragging by one globe radius turns it 75°', () => {
  const turned = drag({ lon: 10, lat: 0, zoom: 1 }, -RADIUS, 0, RADIUS);
  assert.ok(Math.abs(turned.lon - 85) < 1e-9, `lon ${turned.lon}`);
  const tilted = drag({ lon: 10, lat: 0, zoom: 1 }, 0, -RADIUS / 3, RADIUS);
  assert.ok(Math.abs(tilted.lat - -25) < 1e-9, `lat ${tilted.lat}`);
});

test('zoomed in, the ground stays under the finger as it drags, even far north', () => {
  for (const view of [
    { lon: 7.42, lat: 43.74, zoom: 1000 },
    { lon: 10.75, lat: 59.91, zoom: 300 },
    { lon: 12.45, lat: 41.9, zoom: 2000 },
  ]) {
    const before = onScreen({ view, lift: 0 }, view.lon, view.lat);
    const after = onScreen({ view: drag(view, 30, -20, RADIUS), lift: 0 }, view.lon, view.lat);
    const [dx, dy] = [after.x - before.x, after.y - before.y];
    assert.ok(Math.abs(dx - 30) < 0.5 && Math.abs(dy + 20) < 0.5, `at ${view.zoom}× moved by (${dx}, ${dy})`);
  }
});

test('longitude wraps around the antimeridian', () => {
  const view = drag({ lon: 170, lat: 0, zoom: 1 }, -RADIUS * (40 / 75), 0, RADIUS);
  assert.ok(Math.abs(view.lon - -150) < 1e-9, `lon ${view.lon}`);
});

const centre = { x: 0, y: 0 };

test('a pinch scales the zoom it started from, between 0.8× and 2000×', () => {
  assert.equal(pinch(europe, 2, 1.5, centre, centre, RADIUS).zoom, 3);
  assert.equal(pinch(europe, 2, 5000, centre, centre, RADIUS).zoom, 2000);
  assert.equal(pinch(europe, 2, 0.01, centre, centre, RADIUS).zoom, 0.8);
});

test('zoomed in, the ground between the fingers stays under them as they pinch and move', () => {
  // Monaco, off the centre of a view of the Riviera, is where the fingers pinch.
  let view: View = { lon: 7, lat: 43.5, zoom: 100 };
  const start = onScreen({ view, lift: 0 }, 7.42, 43.74);
  const focal = { x: start.x - 201, y: start.y - globeCenterY(screen) };
  for (const scale of [1.2, 1.6, 2.5, 4, 8]) {
    view = pinch(view, 100, scale, focal, focal, RADIUS);
    const monaco = onScreen({ view, lift: 0 }, 7.42, 43.74);
    assert.ok(Math.hypot(monaco.x - start.x, monaco.y - start.y) < 0.5, `at ${view.zoom}× Monaco is at (${monaco.x}, ${monaco.y})`);
  }
  // The fingers drift 12 pt right and 7 pt up while pinching further: Monaco follows them.
  view = pinch(view, 100, 10, focal, { x: focal.x + 12, y: focal.y - 7 }, RADIUS);
  const monaco = onScreen({ view, lift: 0 }, 7.42, 43.74);
  assert.ok(Math.hypot(monaco.x - start.x - 12, monaco.y - start.y + 7) < 0.5, `Monaco is at (${monaco.x}, ${monaco.y})`);
});

test('at the deepest zoom the Vatican is a comfortable 44 pt target, even on a 375 pt wide phone', () => {
  const width = MAX_ZOOM * 0.49 * 375 * vatican.width;
  assert.ok(width >= 44, `${width} pt`);
});

test('a press on + or − doubles or halves the zoom, staying between 0.8× and 2000×', () => {
  assert.equal(zoomIn({ ...europe, zoom: 3 }).zoom, 6);
  assert.equal(zoomOut({ ...europe, zoom: 3 }).zoom, 1.5);
  let view = europe;
  for (let i = 0; i < 11; i++) view = zoomIn(view);
  assert.equal(view.zoom, 2000);
  for (let i = 0; i < 12; i++) view = zoomOut(view);
  assert.equal(view.zoom, 0.8);
  assert.deepEqual({ lon: view.lon, lat: view.lat }, { lon: 10, lat: 45 });
});

/** Holds + (1) or − (-1) at 60 fps until the zoom stops changing; returns the time it took. */
function holdToLimit(view: View, direction: 1 | -1) {
  let elapsed = 0;
  for (;;) {
    const next = holdZoom(view, direction, 1000 / 60);
    if (next.zoom === view.zoom || elapsed > 60_000) return { view, elapsed };
    view = next;
    elapsed += 1000 / 60;
  }
}

test('holding + takes the whole globe to the deepest zoom in under 4 s, and holding − brings it back as fast', () => {
  const deep = holdToLimit(europe, 1);
  assert.equal(deep.view.zoom, 2000);
  assert.ok(deep.elapsed > 2500 && deep.elapsed < 4000, `in ${deep.elapsed} ms`);
  assert.deepEqual({ lon: deep.view.lon, lat: deep.view.lat }, { lon: 10, lat: 45 });
  const back = holdToLimit(deep.view, -1);
  assert.equal(back.view.zoom, 0.8);
  assert.ok(back.elapsed < 4000, `in ${back.elapsed} ms`);
});

test('holding + zooms at the same pace at every zoom, a tenfold every second', () => {
  for (const zoom of [8, 30, 1000]) {
    let view = { ...europe, zoom: zoom / 10 };
    for (let i = 0; i < 60; i++) view = holdZoom(view, 1, 1000 / 60);
    assert.ok(Math.abs(view.zoom / zoom - 1) < 1e-9, `${zoom / 10}× became ${view.zoom}×`);
  }
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

test('zoomed in, a fling coasts on screen as far as with the whole globe and comes gently to rest', () => {
  const flung = { lon: 7.42, lat: 43.74, zoom: 1000 };
  // Finger flung leftwards at 800 pt/s: about 800 × 0.325 = 260 pt more once lifted.
  let view: View = flung;
  let spin: Spin | null = release(flung, -800, 0, RADIUS);
  let lastStep = Infinity;
  let frames = 0;
  while (spin && frames < 600) {
    const before = onScreen({ view: flung, lift: 0 }, view.lon, view.lat).x;
    ({ view, spin } = coast(view, spin, 1000 / 60));
    lastStep = Math.abs(onScreen({ view: flung, lift: 0 }, view.lon, view.lat).x - before);
    frames++;
  }
  assert.ok(spin === null && frames > 60, `stopped after ${frames} frames`);
  const travelled = onScreen({ view: flung, lift: 0 }, view.lon, view.lat).x - 201;
  assert.ok(travelled > 230 && travelled < 270, `coasted ${travelled} pt`);
  assert.ok(lastStep < 0.2, `last frame moved ${lastStep} pt`);
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

test('framing never zooms out past 0.8× nor in past 2000×', () => {
  assert.equal(fit({ lon: 100, lat: 60, width: 3, height: 3 }, screen, SHEET_TOP).view.zoom, 0.8);
  assert.equal(fit({ lon: 7.4, lat: 43.7, width: 1e-5, height: 1e-5 }, screen, SHEET_TOP).view.zoom, 2000);
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

test('flying from the whole globe down to the Vatican, it glides to where it lands, never off screen', () => {
  for (const from of [europe, { lon: 40, lat: 15, zoom: 1.5 }]) {
    const to = fit(vatican, screen, SHEET_TOP);
    assert.equal(to.view.zoom, 2000);
    let previous = onScreen({ view: from, lift: 0 }, vatican.lon, vatican.lat);
    for (const shot of flyAll({ view: from, lift: 0 }, to).shots) {
      const at = onScreen(shot, vatican.lon, vatican.lat);
      const step = Math.hypot(at.x - previous.x, at.y - previous.y);
      assert.ok(step < 30, `jumped ${step} pt in a frame`);
      assert.ok(at.x > 0 && at.x < screen.width && at.y > 0 && at.y < screen.height, `off screen at (${at.x}, ${at.y})`);
      previous = at;
    }
  }
});

test('flying back out from the Vatican to the whole globe, it never leaves the screen', () => {
  const from = fit(vatican, screen, SHEET_TOP);
  for (const shot of flyAll(from, { view: { lon: 30, lat: 20, zoom: 1 }, lift: 0 }).shots) {
    const at = onScreen(shot, vatican.lon, vatican.lat);
    assert.ok(at.x > 0 && at.x < screen.width && at.y > 0 && at.y < screen.height, `off screen at (${at.x}, ${at.y})`);
  }
});

test('the flight eases in and out', () => {
  const { shots } = flyAll({ view: { lon: 0, lat: 0, zoom: 1 }, lift: 0 }, { view: { lon: 90, lat: 0, zoom: 1 }, lift: 0 });
  const steps = shots.map((s, i) => s.view.lon - (i === 0 ? 0 : shots[i - 1].view.lon));
  const middle = steps[Math.floor(steps.length / 2)];
  assert.ok(steps[0] < middle / 5 && steps.at(-1)! < middle / 5, `steps ${steps[0]}, ${middle}, ${steps.at(-1)}`);
});
