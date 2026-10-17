// Globe camera: the view of the globe and how gestures move it. Pure logic, no rendering.
// Every function is a worklet so gestures can run it on the UI thread.
import type { Footprint } from '../atlas/countries.ts';
import { globeCenterY, globeRadius, TOP_BAND, type Viewport } from './projection.ts';

/** The point of the globe facing the user (degrees) and the zoom (1 = whole globe). */
export type View = { lon: number; lat: number; zoom: number };

/** The center never tilts further than this, so a pole never faces the user (#1 R1). */
export const MAX_LAT = 60;

/** Degrees turned per point dragged, for a globe of `radius` points at zoom 1. */
function degreesPerPoint(view: View, radius: number) {
  'worklet';
  return 75 / (radius * view.zoom);
}

function clampLat(lat: number) {
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
  return { lon: wrapLon(view.lon - dx * k), lat: clampLat(view.lat + dy * k), zoom: view.zoom };
}

export const MIN_ZOOM = 0.8;
export const MAX_ZOOM = 24;
/** Zoom factor of the + and − buttons. */
export const ZOOM_STEP = 1.6;

function withZoom(view: View, zoom: number): View {
  'worklet';
  return { lon: view.lon, lat: view.lat, zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)) };
}

/** The view during a pinch that started at `startZoom` and has scaled by `scale` since. */
export function pinch(view: View, startZoom: number, scale: number): View {
  'worklet';
  return withZoom(view, startZoom * scale);
}

export function zoomIn(view: View): View {
  'worklet';
  return withZoom(view, view.zoom * ZOOM_STEP);
}

export function zoomOut(view: View): View {
  'worklet';
  return withZoom(view, view.zoom / ZOOM_STEP);
}

/** Angular speed of a coasting globe, in degrees per second. */
export type Spin = { lon: number; lat: number };

/** Coasting slows by a factor e every this many milliseconds. */
const SPIN_DECAY_MS = 325;
/** Below this speed (degrees per second) the globe stops. */
const SPIN_STOP = 1;

/** The spin a finger leaves the globe with when lifted at (vx, vy) points per second. */
export function release(view: View, vx: number, vy: number, radius: number): Spin {
  'worklet';
  const k = degreesPerPoint(view, radius);
  return { lon: -vx * k, lat: vy * k };
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
  return { view: next, spin: Math.hypot(lonSpin, latSpin) < SPIN_STOP ? null : { lon: lonSpin, lat: latSpin } };
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
  // The short way round: the longitude difference brought into [-180, 180).
  const dLon = wrapLon(to.view.lon - from.view.lon);
  const view = {
    lon: wrapLon(from.view.lon + dLon * e),
    lat: from.view.lat + (to.view.lat - from.view.lat) * e,
    // Geometric, so the zoom feels even whether it doubles at 1× or at 10×.
    zoom: from.view.zoom * Math.pow(to.view.zoom / from.view.zoom, e),
  };
  return { shot: { view, lift: from.lift + (to.lift - from.lift) * e }, done: false };
}
