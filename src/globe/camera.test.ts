/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

import {
  centerOn,
  coast,
  drag,
  fingerVelocity,
  fit,
  fly,
  holdZoom,
  MAX_ZOOM,
  MIN_ZOOM,
  newFingerTrack,
  pinch,
  release,
  startTrack,
  trackFinger,
  zoomIn,
  zoomOut,
  type Shot,
  type Spin,
  type View,
} from './camera.ts';
import { footprintOf } from '../atlas/countries.ts';
import { decodeRegions, type RegionGeometry } from '../atlas/regions.ts';
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

/** 120 Hz, as a ProMotion iPhone reports the finger. */
const TOUCH_MS = 1000 / 120;

/** A stretch of a drag: the finger moving at (vx, vy) pt/s for ms milliseconds. */
type Leg = [vx: number, vy: number, ms: number];

/**
 * A finger that lands at time 0 and moves at each (vx, vy) pt/s for its duration in ms, one
 * after the other, reported every TOUCH_MS. Returns the track and when the last leg ended.
 */
function finger(...legs: Leg[]) {
  const track = newFingerTrack();
  let t = 0;
  startTrack(track, t);
  for (const [vx, vy, ms] of legs) {
    // A finger at rest sends nothing.
    if (vx === 0 && vy === 0) {
      t += ms;
      continue;
    }
    for (let elapsed = TOUCH_MS; elapsed <= ms + 1e-9; elapsed += TOUCH_MS) {
      t += TOUCH_MS;
      trackFinger(track, t, (vx * TOUCH_MS) / 1000, (vy * TOUCH_MS) / 1000);
    }
  }
  return { track, end: t };
}

test('lifting a finger held still for 80 ms leaves the globe still, at any zoom', () => {
  for (const zoom of [1, 30, 1000]) {
    const { track, end } = finger([-1500, 0, 300], [0, 0, 80]);
    assert.equal(release({ ...europe, zoom }, track, end, RADIUS), null, `at ${zoom}×`);
  }
});

test('lifted during a steady drag, the finger is going at the speed it dragged, even a frame late', () => {
  for (const lag of [0, 4, 16]) {
    const { track, end } = finger([-700, 250, 300]);
    const v = fingerVelocity(track, end + lag);
    assert.ok(Math.abs(v.x + 700) < 1 && Math.abs(v.y - 250) < 1, `${lag} ms late: (${v.x}, ${v.y}) pt/s`);
  }
});

test('the release speed is the finger’s in its last 50 ms, not over the whole drag', () => {
  const { track, end } = finger([200, 0, 400], [1200, 0, 100]);
  assert.ok(Math.abs(fingerVelocity(track, end).x - 1200) < 1);
});

test('a finger slowing to a stop before lifting releases slower and slower', () => {
  const speeds = [0, 20, 40, 70].map((rest) => fingerVelocity(finger([1000, 0, 300], [0, 0, rest]).track, rest + 300).x);
  assert.ok(Math.abs(speeds[0] - 1000) < 1, `lifted at once: ${speeds[0]} pt/s`);
  for (let i = 1; i < speeds.length; i++) assert.ok(speeds[i] < speeds[i - 1], `${speeds}`);
  assert.equal(speeds[3], 0);
});

/** How fast, in °/s, the globe spins once a finger is lifted at the end of the drag. */
function launch(view: View, ...legs: Leg[]) {
  const { track, end } = finger(...legs);
  const spin = release(view, track, end, RADIUS);
  return spin ? Math.hypot(spin.lon, spin.lat) : 0;
}

test('lifting a finger after a slow drag leaves the globe still', () => {
  for (const zoom of [1, 1000]) assert.equal(launch({ ...europe, zoom }, [200, -100, 400]), 0, `at ${zoom}×`);
});

test('only a flick launches the globe, faster and faster from a standstill as the flick gets faster', () => {
  const equator = { lon: 0, lat: 0, zoom: 1 };
  let previous = 0;
  let firstFlick = Infinity;
  for (let speed = 0; speed <= 1500; speed += 10) {
    const spin = launch(equator, [speed, 0, 300]);
    if (spin > 0) firstFlick = Math.min(firstFlick, speed);
    // 10 pt/s more on the finger is 3.8°/s more on a 197 pt globe: never a jump.
    assert.ok(spin >= previous && spin - previous < 4, `${speed} pt/s spins at ${spin}°/s, ${previous}°/s before`);
    previous = spin;
  }
  assert.ok(firstFlick >= 250 && firstFlick <= 400, `flicks start at ${firstFlick} pt/s`);
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

/** The spin a finger flicked at (vx, vy) pt/s for 150 ms leaves the globe with. */
function flick(view: View, vx: number, vy: number) {
  const { track, end } = finger([vx, vy, 150]);
  return release(view, track, end, RADIUS);
}

test('after a flick the globe keeps turning the same way, slows down and stops within seconds', () => {
  const flung = { lon: 10, lat: 0, zoom: 1 };
  // Finger flicked leftwards: the globe turns east.
  const spin = flick(flung, -1100, 0);
  assert.ok(spin && spin.lon > 0 && spin.lat === 0, `spin ${JSON.stringify(spin)}`);
  const { view, frames, stopped } = coastToRest(flung, spin);
  assert.ok(stopped, 'the globe stops');
  assert.ok(frames > 60 && frames < 240, `stopped after ${frames} frames`);
  // Decaying by e every 500 ms, as UIKit's 0.998 per ms, it coasts half a second of its launch.
  const coasted = view.lon - flung.lon;
  assert.ok(Math.abs(coasted / (spin.lon * 0.5) - 1) < 0.05, `coasted ${coasted}° at ${spin.lon}°/s`);
  assert.equal(view.lat, 0);
});

test('zoomed in, a flick coasts on screen as far as with the whole globe and comes gently to rest', () => {
  const flung = { lon: 7.42, lat: 43.74, zoom: 1000 };
  const shownX = (view: View) => onScreen({ view: flung, lift: 0 }, view.lon, view.lat).x - 201;
  let spin = flick(flung, -1100, 0);
  assert.ok(spin);
  // How fast the ground moves on screen as the finger lifts, in pt/s.
  const launched = shownX(coast(flung, spin, 1).view) * 1000;
  let view: View = flung;
  let lastStep = Infinity;
  let frames = 0;
  while (spin && frames < 600) {
    const before = shownX(view);
    ({ view, spin } = coast(view, spin, 1000 / 60));
    lastStep = Math.abs(shownX(view) - before);
    frames++;
  }
  assert.ok(spin === null && frames > 60, `stopped after ${frames} frames`);
  assert.ok(Math.abs(shownX(view) / (launched * 0.5) - 1) < 0.05, `coasted ${shownX(view)} pt at ${launched} pt/s`);
  assert.ok(lastStep < 0.2, `last frame moved ${lastStep} pt`);
});

test('a violent flick launches the globe no faster than a brisk one, and not round the world', () => {
  // From 170° W, so the globe turning east does not cross the antimeridian before 350°.
  const flung = { lon: -170, lat: 0, zoom: 1 };
  const brisk = flick(flung, -6000, 0);
  const violent = flick(flung, -20000, 0);
  assert.ok(brisk && violent);
  assert.ok(Math.abs(violent.lon - brisk.lon) < 1e-9, `${brisk.lon}°/s then ${violent.lon}°/s`);
  const coasted = coastToRest(flung, violent).view.lon - flung.lon;
  assert.ok(coasted > 0 && coasted < 300, `coasted ${coasted}°`);
});

test('a flick never tilts the view past 60° S', () => {
  const flung = { lon: 10, lat: 50, zoom: 1 };
  let lowest = Infinity;
  let view = flung;
  let spin: Spin | null = flick(flung, 0, -5000);
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

/** Every Region the app ships, with the outlines of its Country's Regions. */
const REGIONS_DIR = new URL('../../assets/regions/', import.meta.url);
const shippedRegions = readdirSync(REGIONS_DIR).flatMap((file) => {
  const own: RegionGeometry = decodeRegions(JSON.parse(readFileSync(new URL(file, REGIONS_DIR), 'utf8')));
  return own.regions.map(({ name }, index) => ({ name, index, geometry: own.geometry }));
});

/** The on-screen bounds of the largest ring of Region `index` for a Shot, by its area on screen. */
function largestRingOnScreen(shot: Shot, { xyz, ringStart, ringCountry }: RegionGeometry['geometry'], index: number) {
  const f = frameFor(shot.view, screen, shot.lift);
  let largest = { area: -1, left: 0, right: 0, top: 0, bottom: 0 };
  for (let r = 0; r < ringCountry.length; r++) {
    if (ringCountry[r] !== index) continue;
    const ring = { area: 0, left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
    const at = (i: number) => ({
      x: f.cx + f.s * (xyz[3 * i] * f.ex + xyz[3 * i + 1] * f.ey + xyz[3 * i + 2] * f.ez),
      y: f.cy - f.s * (xyz[3 * i] * f.nx + xyz[3 * i + 1] * f.ny + xyz[3 * i + 2] * f.nz),
    });
    let previous = at(ringStart[r + 1] - 1);
    for (let i = ringStart[r]; i < ringStart[r + 1]; i++) {
      const p = at(i);
      ring.area += (previous.x * p.y - p.x * previous.y) / 2;
      ring.left = Math.min(ring.left, p.x);
      ring.right = Math.max(ring.right, p.x);
      ring.top = Math.min(ring.top, p.y);
      ring.bottom = Math.max(ring.bottom, p.y);
      previous = p;
    }
    ring.area = Math.abs(ring.area);
    if (ring.area > largest.area) largest = ring;
  }
  return largest;
}

test('framing any Region shows the whole of its largest part in the band above the half-open sheet', () => {
  for (const { name, index, geometry } of shippedRegions) {
    const shot = fit(footprintOf(geometry, index), screen, SHEET_TOP);
    const { left, right, top, bottom } = largestRingOnScreen(shot, geometry, index);
    assert.ok(
      left >= 0 && right <= screen.width && top >= TOP_BAND && bottom <= SHEET_TOP,
      `${name}: x ${left} to ${right}, y ${top} to ${bottom}`,
    );
  }
});

test('framing a Region stays within the zoom bounds, the smallest at the deepest zoom', () => {
  for (const { name, index, geometry } of shippedRegions) {
    const { zoom } = fit(footprintOf(geometry, index), screen, SHEET_TOP).view;
    assert.ok(zoom >= MIN_ZOOM && zoom <= MAX_ZOOM, `${name} at ${zoom}×`);
  }
  // Mont Buxton, on Mahé in the Seychelles, about 1.5 km across: "Mont Buxto" in geoBoundaries.
  const buxton = shippedRegions.find((r) => r.name === 'Mont Buxto')!;
  assert.equal(fit(footprintOf(buxton.geometry, buxton.index), screen, SHEET_TOP).view.zoom, MAX_ZOOM);
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
