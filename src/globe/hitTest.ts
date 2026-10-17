// Hit-test: which Country is under a tap. Runs on the UI thread inside the tap gesture, so
// the flight can start on the very next frame (#1 R4): plain loops over the Atlas's typed
// arrays, and only over the rings whose bounding cap comes near the tap.
import type { CountryGeometry } from '../atlas/countries.ts';
import type { Frame } from './projection.ts';

/** A tap this close to a Country, in points, still finds it when it lands in the sea. */
export const TAP_TOLERANCE = 12;
/** A tap this close to a Country too small to aim at finds it even inside its neighbour. */
const TINY_TOLERANCE = 4;

/**
 * Index of the Country under the screen point (x, y), or -1 for open sea and space. A tap
 * inside a Country finds it; a tap in the sea finds the nearest coast within `tolerance`
 * points. A Country smaller on screen than `tolerance` (Monaco, Singapore, the Caribbean
 * islands) is too small to aim at: within `tolerance` of a tap in the sea, or 4 points of a
 * tap on its neighbour, it wins.
 *
 * Outlines are tested at the level of detail they are drawn with (see traceCountries), which
 * is what the user sees and spares most of the points at low zoom.
 */
export function countryAt(
  geometry: CountryGeometry,
  frame: Frame,
  detail: number,
  x: number,
  y: number,
  tolerance?: number,
): number {
  'worklet';
  // Not a default parameter: it would run before the worklet unpacks TAP_TOLERANCE from its
  // closure, and throw on the UI thread (see worklets.test.ts).
  const near = tolerance ?? TAP_TOLERANCE;
  const { xyz, level, ringStart, ringCap, ringCountry, footprints } = geometry;
  const { ex, ey, ez, nx, ny, nz, fx, fy, fz, s } = frame;
  const maxLevel = Math.floor(-2 * Math.log2(detail / (s * s)));
  const u = (x - frame.cx) / s;
  const v = -(y - frame.cy) / s;
  if (u * u + v * v > 1) return -1;
  // The tapped point P of the unit sphere, and an orthonormal basis (a, b) of its tangent plane.
  const w = Math.sqrt(1 - u * u - v * v);
  const px = u * ex + v * nx + w * fx;
  const py = u * ey + v * ny + w * fy;
  const pz = u * ez + v * nz + w * fz;
  const ep = ex * px + ey * py + ez * pz;
  let ax = ex - ep * px;
  let ay = ey - ep * py;
  let az = ez - ep * pz;
  const aLength = Math.sqrt(ax * ax + ay * ay + az * az);
  ax /= aLength;
  ay /= aLength;
  az /= aLength;
  const bx = py * az - pz * ay;
  const by = pz * ax - px * az;
  const bz = px * ay - py * ax;

  const reach = near / s;
  let nearest = -1;
  let nearestDistance = reach;
  let nearestTiny = -1;
  let nearestTinyDistance = reach;
  // Countries whose rings wind around P an odd number of times (a hole cancels its outline).
  const inside: number[] = [];

  const rings = ringStart.length - 1;
  for (let r = 0; r < rings; r++) {
    const c = 4 * r;
    const dot = ringCap[c] * px + ringCap[c + 1] * py + ringCap[c + 2] * pz;
    if (Math.acos(Math.max(-1, Math.min(1, dot))) - ringCap[c + 3] > reach) continue;

    const start = ringStart[r];
    const end = ringStart[r + 1];
    const country = ringCountry[r];
    const size = Math.max(footprints[4 * country + 2], footprints[4 * country + 3]) * s;
    const tiny = size < near;
    // Winding angle of the ring around P, edge by edge on the sphere: ±2π inside, 0 outside.
    // The ring's first point is an arc end, always drawn; the last edge comes back to it.
    let winding = 0;
    let qx = xyz[3 * start];
    let qy = xyz[3 * start + 1];
    let qz = xyz[3 * start + 2];
    let qu = qx * ax + qy * ay + qz * az;
    let qv = qx * bx + qy * by + qz * bz;
    let qw = qx * px + qy * py + qz * pz;
    for (let k = start + 1; k <= end; k++) {
      const i = k === end ? start : k;
      if (level[i] > maxLevel) continue;
      const rx = xyz[3 * i];
      const ry = xyz[3 * i + 1];
      const rz = xyz[3 * i + 2];
      const ru = rx * ax + ry * ay + rz * az;
      const rv = rx * bx + ry * by + rz * bz;
      const rw = rx * px + ry * py + rz * pz;
      // P · (Q × R), and Q · R less its component along P: the angle Q P R seen from P.
      const triple = px * (qy * rz - qz * ry) + py * (qz * rx - qx * rz) + pz * (qx * ry - qy * rx);
      winding += Math.atan2(triple, qx * rx + qy * ry + qz * rz - qw * rw);
      // Distance from P to the edge, in the tangent plane: close to the angle for short reaches.
      if (qw > 0 && rw > 0) {
        const du = ru - qu;
        const dv = rv - qv;
        const length2 = du * du + dv * dv;
        const t = length2 > 0 ? Math.max(0, Math.min(1, -(qu * du + qv * dv) / length2)) : 0;
        const distance = Math.hypot(qu + t * du, qv + t * dv);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = country;
        }
        if (tiny && distance < nearestTinyDistance) {
          nearestTinyDistance = distance;
          nearestTiny = country;
        }
      }
      qx = rx;
      qy = ry;
      qz = rz;
      qu = ru;
      qv = rv;
      qw = rw;
    }
    if (Math.abs(winding) > Math.PI) {
      const k = inside.indexOf(country);
      if (k < 0) inside.push(country);
      else inside.splice(k, 1);
    }
  }
  // A tap inside a tiny Country is within 0 points of it, so it wins here too.
  if (nearestTiny >= 0 && (inside.length === 0 || nearestTinyDistance * s <= TINY_TOLERANCE)) return nearestTiny;
  if (inside.length > 0) return inside[0];
  return nearest;
}
