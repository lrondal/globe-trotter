// Where a Place's Photo thumbnail sits on the globe: the pole of inaccessibility of its largest
// polygon, the point of land farthest from its coast, so that it is always on the Place, even
// a crescent or a ring around a lake whose centroid falls outside. Found with polylabel's
// search (Mapbox): square cells, split while one could still hold a farther point.
import { geoAzimuthalEquidistant, geoCentroid } from 'd3-geo';

type Ring = [number, number][];

/** Cells are split until they could gain less than this share of the polygon's size. */
const PRECISION = 1 / 200;

/**
 * The pole of inaccessibility of a polygon (outer ring, then holes), in degrees [lon, lat].
 * Rings are wound as d3 measures them on the sphere: the outer ring clockwise.
 */
export function poleOfInaccessibility(polygon: Ring[]): [number, number] {
  // Projected around its centre, keeping distances from it: across the antimeridian, around
  // a pole (Antarctica) or far north, the polygon keeps its shape.
  const [lon0, lat0] = geoCentroid({ type: 'Polygon', coordinates: polygon });
  const projection = geoAzimuthalEquidistant().rotate([-lon0, -lat0]).scale(1).translate([0, 0]).precision(0);
  const rings = polygon.map((ring) => ring.map((point) => projection(point) as [number, number]));

  const [x0, y0, x1, y1] = boxOf(rings[0]);
  const size = Math.min(x1 - x0, y1 - y0);
  const precision = Math.max(x1 - x0, y1 - y0) * PRECISION;
  let best = centroidCell(rings);
  if (size > 0) {
    const queue: Cell[] = [];
    const h = size / 2;
    for (let x = x0; x < x1; x += size) {
      for (let y = y0; y < y1; y += size) queue.push(cell(x + h, y + h, h, rings));
    }
    while (queue.length > 0) {
      // The cell that could hold the farthest point first.
      queue.sort((a, b) => a.max - b.max);
      const c = queue.pop()!;
      if (c.d > best.d) best = c;
      if (c.max - best.d <= precision) continue;
      const q = c.h / 2;
      queue.push(cell(c.x - q, c.y - q, q, rings), cell(c.x + q, c.y - q, q, rings));
      queue.push(cell(c.x - q, c.y + q, q, rings), cell(c.x + q, c.y + q, q, rings));
    }
  }
  return projection.invert!([best.x, best.y]) as [number, number];
}

/** A square cell: its centre, half its side, its centre's signed distance to the coast, and the most any point of it could have. */
type Cell = { x: number; y: number; h: number; d: number; max: number };

function cell(x: number, y: number, h: number, rings: Ring[]): Cell {
  const d = signedDistance(x, y, rings);
  return { x, y, h, d, max: d + h * Math.SQRT2 };
}

/** The cell at the polygon's centroid: a first guess, good for most shapes. */
function centroidCell(rings: Ring[]): Cell {
  const ring = rings[0];
  let [area, x, y] = [0, 0, 0];
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [a, b] = [ring[i], ring[j]];
    const f = a[0] * b[1] - b[0] * a[1];
    x += (a[0] + b[0]) * f;
    y += (a[1] + b[1]) * f;
    area += f * 3;
  }
  return area === 0 ? cell(ring[0][0], ring[0][1], 0, rings) : cell(x / area, y / area, 0, rings);
}

/** Distance from the point to the polygon's outline: positive inside, negative outside. */
function signedDistance(x: number, y: number, rings: Ring[]): number {
  let inside = false;
  let min = Infinity;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [a, b] = [ring[i], ring[j]];
      if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
      min = Math.min(min, segmentDistance(x, y, a, b));
    }
  }
  return (inside ? 1 : -1) * min;
}

function segmentDistance(x: number, y: number, [ax, ay]: [number, number], [bx, by]: [number, number]): number {
  const [dx, dy] = [bx - ax, by - ay];
  const length2 = dx * dx + dy * dy;
  const t = length2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / length2)) : 0;
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
}

/** Without spreading: a ring of a large Country has more points than a call takes arguments. */
function boxOf(ring: Ring): [number, number, number, number] {
  const box: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of ring) {
    box[0] = Math.min(box[0], x);
    box[1] = Math.min(box[1], y);
    box[2] = Math.max(box[2], x);
    box[3] = Math.max(box[3], y);
  }
  return box;
}
