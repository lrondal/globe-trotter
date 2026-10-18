// Globe projection: draws the Countries and the graticule for a View, straight into a Skia
// path builder. Runs on the UI thread on every frame (all worklets): plain loops over the
// typed arrays prepared once by the Atlas, no d3, no React, no rounding of coordinates.
//
// Worklets are not hoisted: the worklets Babel plugin turns each function into a `const`
// whose closure is captured where it is defined, so a worklet must be defined above the
// worklets that call it.
//
// Orthographic projection: with e, n, f the view's east, north and forward unit vectors, a
// point P of the unit sphere is drawn at (cx + s P·e, cy - s P·n), and faces the user when
// P·f >= 0.
import type { CountryGeometry } from '../atlas/countries.ts';
import type { Point, View } from './camera.ts';

/** What the projection draws into: a Skia SkPathBuilder fits. */
export type PathSink = {
  moveTo(x: number, y: number): unknown;
  lineTo(x: number, y: number): unknown;
  conicTo(x1: number, y1: number, x2: number, y2: number, w: number): unknown;
  close(): unknown;
};

export type Viewport = { width: number; height: number };

/** Height of the band above the globe, kept for the search field. */
export const TOP_BAND = 96;

/** Radius in points of the globe at zoom 1: its diameter is 0.98 × the smaller side. */
export function globeRadius(viewport: Viewport) {
  'worklet';
  return 0.49 * Math.min(viewport.width, viewport.height);
}

/** Vertical centre of the globe: the middle of the screen below the top band. */
export function globeCenterY(viewport: Viewport) {
  'worklet';
  return TOP_BAND + (viewport.height - TOP_BAND) / 2;
}

/**
 * Level of detail, as the area in square points under which a wiggle of a coastline or
 * border is dropped. It depends only on the zoom, never on motion, and stays well under a
 * pixel, so outlines never visibly change (#1 R3). Larger draws fewer points per frame.
 */
export const DETAIL = { fine: 0.1, standard: 0.25, light: 0.6 } as const;
export type Detail = keyof typeof DETAIL;

export type Frame = {
  ex: number; ey: number; ez: number;
  nx: number; ny: number; nz: number;
  fx: number; fy: number; fz: number;
  /** Globe radius on screen, in points. */
  s: number;
  cx: number;
  cy: number;
  width: number;
  height: number;
};

/** `lift` raises the globe's centre that many points above its resting place (see Shot). */
export function frameFor(view: View, viewport: Viewport, lift = 0): Frame {
  'worklet';
  const λ = (view.lon * Math.PI) / 180;
  const φ = (view.lat * Math.PI) / 180;
  const [cosλ, sinλ, cosφ, sinφ] = [Math.cos(λ), Math.sin(λ), Math.cos(φ), Math.sin(φ)];
  return {
    ex: -sinλ, ey: cosλ, ez: 0,
    nx: -sinφ * cosλ, ny: -sinφ * sinλ, nz: cosφ,
    fx: cosφ * cosλ, fy: cosφ * sinλ, fz: sinφ,
    s: globeRadius(viewport) * view.zoom,
    cx: viewport.width / 2,
    cy: globeCenterY(viewport) - lift,
    width: viewport.width,
    height: viewport.height,
  };
}

/** Where a point of the globe is drawn, and whether it faces the user. */
export function projectPoint(frame: Frame, point: Point) {
  'worklet';
  const λ = (point.lon * Math.PI) / 180;
  const φ = (point.lat * Math.PI) / 180;
  const px = Math.cos(φ) * Math.cos(λ);
  const py = Math.cos(φ) * Math.sin(λ);
  const pz = Math.sin(φ);
  return {
    x: frame.cx + frame.s * (px * frame.ex + py * frame.ey + pz * frame.ez),
    y: frame.cy - frame.s * (px * frame.nx + py * frame.ny + pz * frame.nz),
    visible: px * frame.fx + py * frame.fy + pz * frame.fz >= 0,
  };
}

/** Distance in points from the globe's centre to the farthest corner of the screen. */
function farthestCorner(frame: Frame) {
  'worklet';
  return Math.hypot(Math.max(frame.cx, frame.width - frame.cx), Math.max(frame.cy, frame.height - frame.cy));
}

/** Angular radius around the view centre that can reach the screen. */
function reachAngle(frame: Frame) {
  'worklet';
  const corner = farthestCorner(frame);
  return frame.s > corner ? Math.asin(corner / frame.s) : Math.PI / 2;
}

/**
 * Radius to draw the globe's disc and rim with. Once the disc covers the whole screen, one
 * just past the farthest corner draws the same, rim hidden: Skia, in float32, then never
 * gets a radius of hundreds of thousands of points.
 */
export function discRadius(frame: Frame) {
  'worklet';
  return Math.min(frame.s, farthestCorner(frame) + 8);
}

/** Rings are clipped this far outside the screen, so the clip edges and their strokes stay hidden. */
const CLIP_MARGIN = 4;

/** Sutherland–Hodgman: the part of a closed ring inside the rectangle, with the same fill. */
function clip(
  ring: Float64Array,
  n: number,
  left: number,
  top: number,
  right: number,
  bottom: number,
): { points: Float64Array; count: number } {
  'worklet';
  let src: Float64Array = ring;
  let count = n;
  // Edges as (axis, bound, keep the side above the bound?).
  const edges: [number, number, boolean][] = [
    [0, left, true],
    [0, right, false],
    [1, top, true],
    [1, bottom, false],
  ];
  for (const [axis, bound, above] of edges) {
    if (count === 0) break;
    const dst = new Float64Array(4 * count + 4);
    let out = 0;
    const inside = (k: number) => (above ? src[2 * k + axis] >= bound : src[2 * k + axis] <= bound);
    for (let k = 0; k < count; k++) {
      const prev = (k + count - 1) % count;
      const inCur = inside(k);
      if (inCur !== inside(prev)) {
        const a = src[2 * prev + axis];
        const t = (bound - a) / (src[2 * k + axis] - a);
        dst[2 * out] = src[2 * prev] + (src[2 * k] - src[2 * prev]) * t;
        dst[2 * out + 1] = src[2 * prev + 1] + (src[2 * k + 1] - src[2 * prev + 1]) * t;
        out++;
      }
      if (inCur) {
        dst[2 * out] = src[2 * k];
        dst[2 * out + 1] = src[2 * k + 1];
        out++;
      }
    }
    src = dst;
    count = out;
  }
  return { points: src, count };
}

/**
 * Traces every visible ring of every Country as one closed subpath each. Returns the number
 * of points drawn, for the measure panel.
 *
 * Points behind the globe are pushed radially onto its rim, with the rim between them
 * filled in: a ring that crosses the horizon is then cut along the rim, exactly. That holds
 * as long as no ring surrounds the point opposite the view centre, which the ±60° tilt
 * limit guarantees for the Natural Earth outlines (Antarctica stays south of 60° S).
 */
export function traceCountries(geometry: CountryGeometry, frame: Frame, detail: number, sink: PathSink): number {
  'worklet';
  const { xyz, level, ringStart, ringCap } = geometry;
  const { ex, ey, ez, nx, ny, nz, fx, fy, fz, s, cx, cy } = frame;
  const maxLevel = Math.floor(-2 * Math.log2(detail / (s * s)));
  const reach = reachAngle(frame);
  // Rim steps whose chord strays at most a quarter point from the circle.
  const rimStep = Math.min(0.5, 2 * Math.acos(Math.max(0, 1 - 0.25 / s)));
  const left = -CLIP_MARGIN;
  const top = -CLIP_MARGIN;
  const right = frame.width + CLIP_MARGIN;
  const bottom = frame.height + CLIP_MARGIN;

  let buffer: Float64Array = new Float64Array(4 * geometry.maxRing + 256);
  let n = 0;
  const push = (x: number, y: number) => {
    if (2 * n + 2 > buffer.length) {
      const grown = new Float64Array(buffer.length * 2);
      grown.set(buffer);
      buffer = grown;
    }
    buffer[2 * n] = x;
    buffer[2 * n + 1] = y;
    n++;
  };
  // Fills the rim from direction (ux, uy) to (vx, vy), the short way round, excluding both ends.
  const rim = (ux: number, uy: number, vx: number, vy: number) => {
    const angle = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    const steps = Math.floor(Math.abs(angle) / rimStep);
    if (steps === 0) return;
    const step = angle / (steps + 1);
    const cos = Math.cos(step);
    const sin = Math.sin(step);
    let qx = ux;
    let qy = uy;
    for (let k = 0; k < steps; k++) {
      const rx = qx * cos - qy * sin;
      qy = qx * sin + qy * cos;
      qx = rx;
      push(cx + s * qx, cy - s * qy);
    }
  };

  // Hot loop: plain scalars only, as array destructuring would allocate on every point.
  let drawn = 0;
  const rings = ringStart.length - 1;
  for (let r = 0; r < rings; r++) {
    const c = 4 * r;
    const dot = ringCap[c] * fx + ringCap[c + 1] * fy + ringCap[c + 2] * fz;
    if (Math.acos(Math.max(-1, Math.min(1, dot))) - ringCap[c + 3] >= reach) continue;

    n = 0;
    let anyFront = false;
    let firstBack = false;
    let firstUx = 0;
    let firstUy = 0;
    let lastBack = false;
    let lastUx = 0;
    let lastUy = 0;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = ringStart[r]; i < ringStart[r + 1]; i++) {
      if (level[i] > maxLevel) continue;
      const px = xyz[3 * i];
      const py = xyz[3 * i + 1];
      const pz = xyz[3 * i + 2];
      const x = px * ex + py * ey + pz * ez;
      const y = px * nx + py * ny + pz * nz;
      const z = px * fx + py * fy + pz * fz;
      const isFirst = n === 0;
      if (z >= 0) {
        anyFront = true;
        lastBack = false;
        push(cx + s * x, cy - s * y);
      } else {
        const length = Math.sqrt(x * x + y * y);
        const ux = length > 1e-12 ? x / length : 1;
        const uy = length > 1e-12 ? y / length : 0;
        if (lastBack) rim(lastUx, lastUy, ux, uy);
        if (isFirst) {
          firstBack = true;
          firstUx = ux;
          firstUy = uy;
        }
        lastBack = true;
        lastUx = ux;
        lastUy = uy;
        push(cx + s * ux, cy - s * uy);
      }
      const sx = buffer[2 * n - 2];
      const sy = buffer[2 * n - 1];
      minX = Math.min(minX, sx);
      maxX = Math.max(maxX, sx);
      minY = Math.min(minY, sy);
      maxY = Math.max(maxY, sy);
    }
    if (!anyFront || n < 3) continue;
    if (lastBack && firstBack) rim(lastUx, lastUy, firstUx, firstUy);

    let points = buffer;
    if (minX < left || minY < top || maxX > right || maxY > bottom) {
      const clipped = clip(buffer, n, left, top, right, bottom);
      points = clipped.points;
      n = clipped.count;
      if (n < 3) continue;
    }

    sink.moveTo(points[0], points[1]);
    let prevX = points[0];
    let prevY = points[1];
    for (let k = 1; k < n; k++) {
      const x = points[2 * k];
      const y = points[2 * k + 1];
      if (x === prevX && y === prevY) continue;
      sink.lineTo(x, y);
      prevX = x;
      prevY = y;
      drawn++;
    }
    sink.close();
    drawn++;
  }
  return drawn;
}

/**
 * Traces the visible part of the circle P(t) = C + a cos t + b sin t, t in [t0, t1]. Its
 * projection is an ellipse, drawn exactly with conics of at most 90° each.
 */
function circle(
  frame: Frame,
  sink: PathSink,
  cX: number, cY: number, cZ: number,
  aX: number, aY: number, aZ: number,
  bX: number, bY: number, bZ: number,
  t0: number,
  t1: number,
) {
  'worklet';
  const { ex, ey, ez, nx, ny, nz, fx, fy, fz, s, cx, cy } = frame;
  // Screen coordinates of C, a and b (a and b as vectors).
  const Cx = cx + s * (cX * ex + cY * ey + cZ * ez);
  const Cy = cy - s * (cX * nx + cY * ny + cZ * nz);
  const Ax = s * (aX * ex + aY * ey + aZ * ez);
  const Ay = -s * (aX * nx + aY * ny + aZ * nz);
  const Bx = s * (bX * ex + bY * ey + bZ * ez);
  const By = -s * (bX * nx + bY * ny + bZ * nz);
  const arc = (from: number, to: number) => {
    const pieces = Math.ceil((to - from) / (Math.PI / 2) - 1e-9);
    if (pieces <= 0) return;
    const sweep = (to - from) / pieces;
    const w = Math.cos(sweep / 2);
    sink.moveTo(Cx + Ax * Math.cos(from) + Bx * Math.sin(from), Cy + Ay * Math.cos(from) + By * Math.sin(from));
    for (let k = 0; k < pieces; k++) {
      const [mid, end] = [from + (k + 0.5) * sweep, from + (k + 1) * sweep];
      sink.conicTo(
        Cx + (Ax * Math.cos(mid) + Bx * Math.sin(mid)) / w,
        Cy + (Ay * Math.cos(mid) + By * Math.sin(mid)) / w,
        Cx + Ax * Math.cos(end) + Bx * Math.sin(end),
        Cy + Ay * Math.cos(end) + By * Math.sin(end),
        w,
      );
    }
  };

  // Drawn where P(t)·f = c0 + α cos t + β sin t > 0 once less the cosine of the reach: facing
  // the user and near enough to the view centre to reach the screen. Zoomed in, the rest of
  // the circle lies far off screen, where Skia's float32 points would lose their precision.
  const c0 = cX * fx + cY * fy + cZ * fz - Math.cos(reachAngle(frame));
  const α = aX * fx + aY * fy + aZ * fz;
  const β = bX * fx + bY * fy + bZ * fz;
  const ρ = Math.hypot(α, β);
  if (ρ <= Math.abs(c0)) {
    if (c0 > 0) arc(t0, t1);
    return;
  }
  const half = Math.acos(-c0 / ρ);
  const fullCircle = t1 - t0 >= 2 * Math.PI - 1e-9;
  let start = Math.atan2(β, α) - half;
  if (fullCircle) {
    arc(start, start + 2 * half);
    return;
  }
  // Visible span [start, start + 2 half] (mod 2π) against the domain [t0, t1].
  const tau = 2 * Math.PI;
  start = t0 - tau + ((((start - (t0 - tau)) % tau) + tau) % tau);
  const end = start + 2 * half;
  if (end > t0) arc(t0, Math.min(end, t1));
  if (start + tau < t1) arc(start + tau, Math.min(end + tau, t1));
}

/** Traces the 10° graticule: meridians to ±80° (±90° every 90°) and parallels from 80° S to 80° N. */
export function traceGraticule(frame: Frame, sink: PathSink) {
  'worklet';
  const rad = Math.PI / 180;
  for (let lon = -180; lon < 180; lon += 10) {
    const extent = (lon % 90 === 0 ? 90 : 80) * rad;
    const [cosλ, sinλ] = [Math.cos(lon * rad), Math.sin(lon * rad)];
    // P(t) = cos t (cos λ, sin λ, 0) + sin t (0, 0, 1), t the latitude.
    circle(frame, sink, 0, 0, 0, cosλ, sinλ, 0, 0, 0, 1, -extent, extent);
  }
  for (let lat = -80; lat <= 80; lat += 10) {
    const [cosφ, sinφ] = [Math.cos(lat * rad), Math.sin(lat * rad)];
    // P(t) = (0, 0, sin φ) + cos t (cos φ, 0, 0) + sin t (0, cos φ, 0), t the longitude.
    circle(frame, sink, 0, 0, sinφ, cosφ, 0, 0, 0, cosφ, 0, 0, 2 * Math.PI);
  }
}
