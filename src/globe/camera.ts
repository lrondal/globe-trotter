// Globe camera: the view of the globe and how gestures move it. Pure logic, no rendering.
// Every function is a worklet so gestures can run it on the UI thread.
import type { Footprint } from '../atlas/countries.ts';
import { globeCenterY, globeRadius, TOP_BAND, type Viewport } from './projection.ts';

/** The point of the globe facing the user (degrees) and the zoom (1 = whole globe). */
export type View = { lon: number; lat: number; zoom: number };

/** The center never tilts further than this, so a pole never faces the user (#1 R1). */
export const MAX_LAT = 60;

/**
 * Degrees turned per point dragged, for a globe of `radius` points at zoom 1. With the whole
 * globe in view, one on-screen radius turns it 75°, so it spins lightly like a ball. Zoomed
 * in, the globe is a map and the ground stays under the finger: one radian per on-screen
 * radius, and longitudes stretched by the shrinking of the parallels.
 */
function degreesPerPoint(view: View, radius: number): Point {
  'worklet';
  const ball = Math.min(1, 1 / view.zoom);
  const lat = (180 / Math.PI + (75 - 180 / Math.PI) * ball) / (radius * view.zoom);
  const cos = Math.cos((view.lat * Math.PI) / 180);
  return { lon: lat / (cos + (1 - cos) * ball), lat };
}

export function clampLat(lat: number) {
  'worklet';
  return Math.max(-MAX_LAT, Math.min(MAX_LAT, lat));
}

/** Longitude in [-180, 180). */
function wrapLon(lon: number) {
  'worklet';
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

/** Turns the globe under a finger that moved by (dx, dy) points. */
export function drag(view: View, dx: number, dy: number, radius: number): View {
  'worklet';
  const k = degreesPerPoint(view, radius);
  return { lon: wrapLon(view.lon - dx * k.lon), lat: clampLat(view.lat + dy * k.lat), zoom: view.zoom };
}

/** A distance on screen, in points. */
export type Offset = { x: number; y: number };

/** The ground (a unit vector) drawn `at` points from the globe's centre, or null off the globe. */
function groundAt(view: View, at: Offset, radius: number): [number, number, number] | null {
  'worklet';
  const u = at.x / (radius * view.zoom);
  const v = -at.y / (radius * view.zoom);
  if (u * u + v * v >= 1) return null;
  const w = Math.sqrt(1 - u * u - v * v);
  const λ = (view.lon * Math.PI) / 180;
  const φ = (view.lat * Math.PI) / 180;
  // u e + v n + w f, with the view's east, north and forward vectors (see projection.ts).
  const out = w * Math.cos(φ) - v * Math.sin(φ);
  return [out * Math.cos(λ) - u * Math.sin(λ), out * Math.sin(λ) + u * Math.cos(λ), v * Math.cos(φ) + w * Math.sin(φ)];
}

/**
 * The view, at the zoom of `view`, that draws `ground` (a unit vector) `at` points from the
 * globe's centre; `view` itself when no view can. Exact, so a pinch never drifts.
 */
function showAt(view: View, ground: [number, number, number], at: Offset, radius: number): View {
  'worklet';
  const [px, py, pz] = ground;
  const u = at.x / (radius * view.zoom);
  const v = -at.y / (radius * view.zoom);
  // East of the centre by u: the longitude. Then north of it by v, facing the user: the latitude.
  const cosφ = Math.hypot(px, py);
  if (Math.abs(u) >= cosφ) return view;
  const q = Math.sqrt(cosφ * cosφ - u * u);
  const ρ = Math.hypot(q, pz);
  if (Math.abs(v) >= ρ) return view;
  const lon = Math.atan2(py, px) - Math.asin(u / cosφ);
  const lat = Math.atan2(pz, q) - Math.asin(v / ρ);
  return { lon: wrapLon((lon * 180) / Math.PI), lat: clampLat((lat * 180) / Math.PI), zoom: view.zoom };
}

export const MIN_ZOOM = 0.8;
/** Deep enough for the Vatican, the smallest Country, to be a 44 pt target on any phone (#26). */
export const MAX_ZOOM = 2000;
/** Zoom factor of a press on the + and − buttons. */
export const ZOOM_STEP = 2;
/** Zoom factor per second while + or − is held: the whole range in about 3 s. */
const HOLD_RATE = 10;

function withZoom(view: View, zoom: number): View {
  'worklet';
  return { lon: view.lon, lat: view.lat, zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)) };
}

/**
 * The view during a pinch that started at `startZoom` and has scaled by `scale` since. The
 * ground under the fingers stays under them: `focal` is the point between the fingers, from
 * the globe's centre on screen, and `moved` how far it moved since the last update.
 */
export function pinch(view: View, startZoom: number, scale: number, focal: Offset, moved: Offset, radius: number): View {
  'worklet';
  const zoomed = withZoom(view, startZoom * scale);
  const ground = groundAt(view, { x: focal.x - moved.x, y: focal.y - moved.y }, radius);
  return ground ? showAt(zoomed, ground, focal, radius) : zoomed;
}

export function zoomIn(view: View): View {
  'worklet';
  return withZoom(view, view.zoom * ZOOM_STEP);
}

export function zoomOut(view: View): View {
  'worklet';
  return withZoom(view, view.zoom / ZOOM_STEP);
}

/** The view `dt` milliseconds later while + (`direction` 1) or − (-1) is held down. */
export function holdZoom(view: View, direction: 1 | -1, dt: number): View {
  'worklet';
  return withZoom(view, view.zoom * Math.pow(HOLD_RATE, (direction * dt) / 1000));
}

/** Angular speed of a coasting globe, in degrees per second. */
export type Spin = { lon: number; lat: number };

/** Coasting slows by a factor e every this many milliseconds. */
const SPIN_DECAY_MS = 325;
/** Below this speed (degrees per second at zoom 1, a few points per second on screen) the globe stops. */
const SPIN_STOP = 1;

/** The spin a finger leaves the globe with when lifted at (vx, vy) points per second. */
export function release(view: View, vx: number, vy: number, radius: number): Spin {
  'worklet';
  const k = degreesPerPoint(view, radius);
  return { lon: -vx * k.lon, lat: vy * k.lat };
}

/** Advances a coasting globe by `dt` milliseconds; the spin is null once it has stopped. */
export function coast(view: View, spin: Spin, dt: number): { view: View; spin: Spin | null } {
  'worklet';
  const lat = clampLat(view.lat + (spin.lat * dt) / 1000);
  const next = { lon: wrapLon(view.lon + (spin.lon * dt) / 1000), lat, zoom: view.zoom };
  const decay = Math.exp(-dt / SPIN_DECAY_MS);
  // Hitting the tilt limit ends the vertical part of the spin.
  const latSpin = Math.abs(lat) === MAX_LAT ? 0 : spin.lat * decay;
  const lonSpin = spin.lon * decay;
  const stopped = Math.hypot(lonSpin, latSpin) < SPIN_STOP / view.zoom;
  return { view: next, spin: stopped ? null : { lon: lonSpin, lat: latSpin } };
}

/** A point of the globe, in degrees. */
export type Point = { lon: number; lat: number };

/**
 * The whole globe facing `point`. The longitude is the one nearest the current view's, maybe
 * outside [-180, 180), so animating towards it turns the globe the short way.
 */
export function centerOn(view: View, point: Point): View {
  'worklet';
  return { lon: view.lon + wrapLon(point.lon - view.lon), lat: clampLat(point.lat), zoom: 1 };
}

/**
 * A View plus how far, in points, the globe's centre is lifted above its resting place on
 * screen, so that a Place framed at the centre shows above the sheet.
 */
export type Shot = { view: View; lift: number };

/** Share of the band above the sheet that a framed Place fills. */
const FIT_FILL = 0.78;

/**
 * The Shot that frames a Place in the band between the top band and the sheet, whose top
 * edge is at `sheetTop` points: centred in it, and filling 78% of it.
 */
export function fit(place: Footprint, viewport: Viewport, sheetTop: number): Shot {
  'worklet';
  const r = globeRadius(viewport);
  const band = sheetTop - TOP_BAND;
  const fill = Math.min(viewport.width / (place.width * r), band / (place.height * r));
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, FIT_FILL * fill));
  const lat = clampLat(place.lat);
  // Beyond the tilt limit the Place sits above the centre: lift the globe further to compensate.
  const above = r * zoom * Math.sin(((place.lat - lat) * Math.PI) / 180);
  const lift = globeCenterY(viewport) - above - (TOP_BAND + sheetTop) / 2;
  return { view: { lon: place.lon, lat, zoom }, lift };
}

export const FLIGHT_MS = 900;

function cubicInOut(t: number) {
  'worklet';
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** The Shot `elapsed` milliseconds into the flight from `from` to `to`. */
export function fly(from: Shot, to: Shot, elapsed: number): { shot: Shot; done: boolean } {
  'worklet';
  if (elapsed >= FLIGHT_MS) return { shot: to, done: true };
  const e = cubicInOut(Math.max(0, elapsed) / FLIGHT_MS);
  // The globe turns in step with the width in view, which shrinks geometrically with the
  // zoom: most of the turn while zoomed out, so the Place glides steadily to where it lands
  // instead of shooting off screen when the zoom changes a thousandfold.
  const widths = from.view.zoom / to.view.zoom;
  const turned = Math.abs(widths - 1) < 1e-9 ? e : (Math.pow(widths, e) - 1) / (widths - 1);
  // The short way round: the longitude difference brought into [-180, 180).
  const dLon = wrapLon(to.view.lon - from.view.lon);
  const view = {
    lon: wrapLon(from.view.lon + dLon * turned),
    lat: from.view.lat + (to.view.lat - from.view.lat) * turned,
    // Geometric, so the zoom feels even whether it doubles at 1× or at 10×.
    zoom: from.view.zoom * Math.pow(to.view.zoom / from.view.zoom, e),
  };
  return { shot: { view, lift: from.lift + (to.lift - from.lift) * e }, done: false };
}
