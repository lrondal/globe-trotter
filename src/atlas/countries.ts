// The Countries shipped with the app (assets/data/countries.json, made by scripts/countries.ts).

export type CountryRecord = { id: string; name: string };

/**
 * Where a Place sits and how much of the globe it covers: its centre (degrees), and the
 * width and height, in globe radii, of its outline seen from straight above that centre.
 */
export type Footprint = { lon: number; lat: number; width: number; height: number };

/**
 * A Country's outline: polygons of rings, each ring a list of arc indices (TopoJSON
 * convention: `~i` walks arc `i` backwards). Arcs are shared between neighbours, so
 * shared borders stay identical at every level of detail.
 */
export type CountryData = CountryRecord & { polygons: number[][][] };

/**
 * Each arc is a flat list of points `lon, lat, level`. lon and lat are in 1e-4 degrees, the
 * first point absolute and the next ones as deltas. `level` is the point's Visvalingam
 * importance: `floor(-2 log2(area))` of its effective triangle on the unit sphere, so
 * smaller means more important; arc ends are 0 and always drawn.
 */
export type CountriesData = { countries: CountryData[]; arcs: number[][] };

export const COORD_SCALE = 1e4;

/**
 * Every ring of every Country, ready to project: flat typed arrays, so the renderer can
 * copy them to the UI thread once and walk them without allocating.
 */
export type CountryGeometry = {
  /** Unit vectors, 3 numbers per point (x towards 0°E, z towards the North Pole). */
  xyz: Float64Array;
  /** Visvalingam level of each point (see CountriesData). */
  level: Uint8Array;
  /** Ring r is points ringStart[r] to ringStart[r + 1] - 1. Rings are not closed. */
  ringStart: Int32Array;
  /** Per ring: unit vector of its centre and its angular radius in radians, 4 numbers per ring. */
  ringCap: Float64Array;
  /** Index in `countries` of each ring's Country. */
  ringCountry: Int32Array;
  /** Most points in a single ring. */
  maxRing: number;
  /** Per Country: the Footprint of its largest polygon, as lon, lat, width, height. */
  footprints: Float64Array;
};

/** The Footprint of Country `c`, the one the globe frames when it is selected. */
export function footprintOf(geometry: CountryGeometry, c: number): Footprint {
  'worklet';
  const f = geometry.footprints;
  return { lon: f[4 * c], lat: f[4 * c + 1], width: f[4 * c + 2], height: f[4 * c + 3] };
}

export function decodeCountries(data: CountriesData): {
  countries: CountryRecord[];
  geometry: CountryGeometry;
} {
  const arcs = data.arcs.map(decodeArc);
  const xyz: number[] = [];
  const level: number[] = [];
  const ringStart: number[] = [];
  const ringCountry: number[] = [];
  /** Per Country, the index of each of its rings. */
  const countryRings: number[][] = data.countries.map(() => []);

  data.countries.forEach((country, c) => {
    for (const polygon of country.polygons) {
      for (const ring of polygon) {
        countryRings[c].push(ringCountry.length);
        ringStart.push(level.length);
        ringCountry.push(c);
        ring.forEach((index, a) => {
          const arc = index < 0 ? arcs[~index] : arcs[index];
          const n = arc.level.length;
          // Consecutive arcs share their junction point: skip it, and the ring's closing point.
          for (let k = a === 0 ? 0 : 1; k < n; k++) {
            if (a === ring.length - 1 && k === n - 1) break;
            const p = index < 0 ? n - 1 - k : k;
            xyz.push(arc.xyz[3 * p], arc.xyz[3 * p + 1], arc.xyz[3 * p + 2]);
            level.push(arc.level[p]);
          }
        });
      }
    }
  });
  ringStart.push(level.length);

  const points = new Float64Array(xyz);
  const rings = ringCountry.length;
  const ringCap = new Float64Array(rings * 4);
  let maxRing = 0;
  for (let r = 0; r < rings; r++) {
    const [start, end] = [ringStart[r], ringStart[r + 1]];
    maxRing = Math.max(maxRing, end - start);
    let [x, y, z] = [0, 0, 0];
    for (let i = start; i < end; i++) {
      x += points[3 * i];
      y += points[3 * i + 1];
      z += points[3 * i + 2];
    }
    const norm = Math.hypot(x, y, z);
    // A ring around a pole can average to ~0: give it a cap that is never culled.
    if (norm < 1e-9) {
      ringCap.set([0, 0, 1, Math.PI], r * 4);
      continue;
    }
    [x, y, z] = [x / norm, y / norm, z / norm];
    let minDot = 1;
    for (let i = start; i < end; i++) {
      minDot = Math.min(minDot, x * points[3 * i] + y * points[3 * i + 1] + z * points[3 * i + 2]);
    }
    ringCap.set([x, y, z, Math.acos(Math.max(-1, minDot))], r * 4);
  }

  const footprints = new Float64Array(data.countries.length * 4);
  countryRings.forEach((own, c) => {
    // The largest polygon, seen from above its own centre: the largest ring, as a hole is
    // always smaller than the outline around it.
    const seen = own.map((r) => {
      // A ring around a pole (its cap covers the globe) is seen from that pole.
      const aroundPole = ringCap[4 * r + 3] >= Math.PI;
      const view = seenFrom(aroundPole ? [0, 0, Math.sign(points[3 * ringStart[r] + 2]) || 1] : ringCap.subarray(4 * r, 4 * r + 3));
      return { r, view, ...ringInView(points, ringStart[r], ringStart[r + 1], view) };
    });
    const largest = seen.reduce((a, b) => (b.area > a.area ? b : a));
    // Re-seen from above its centroid, to measure how much of the globe it covers.
    const { view, centroid } = largest;
    const w = Math.sqrt(Math.max(0, 1 - centroid.u ** 2 - centroid.v ** 2));
    const centre = [0, 1, 2].map((k) => w * view.f[k] + centroid.u * view.e[k] + centroid.v * view.n[k]);
    const { extent } = ringInView(points, ringStart[largest.r], ringStart[largest.r + 1], seenFrom(centre));
    const lon = (Math.atan2(centre[1], centre[0]) * 180) / Math.PI;
    const lat = (Math.asin(Math.max(-1, Math.min(1, centre[2]))) * 180) / Math.PI;
    footprints.set([lon, lat, 2 * extent.u, 2 * extent.v], 4 * c);
  });

  return {
    countries: data.countries.map(({ id, name }) => ({ id, name })),
    geometry: {
      xyz: points,
      level: new Uint8Array(level),
      ringStart: new Int32Array(ringStart),
      ringCap,
      ringCountry: new Int32Array(ringCountry),
      maxRing,
      footprints,
    },
  };
}

type Basis = { e: number[]; n: number[]; f: number[] };

/** East, north and forward unit vectors of a view looking straight down at unit vector `f`. */
function seenFrom(f: ArrayLike<number>): Basis {
  const λ = Math.atan2(f[1], f[0]);
  const φ = Math.asin(Math.max(-1, Math.min(1, f[2])));
  return {
    e: [-Math.sin(λ), Math.cos(λ), 0],
    n: [-Math.sin(φ) * Math.cos(λ), -Math.sin(φ) * Math.sin(λ), Math.cos(φ)],
    f: [f[0], f[1], f[2]],
  };
}

/**
 * A ring drawn by the orthographic view `basis`, in globe radii: its area and centroid
 * (shoelace), and its largest distance from the view centre along each axis.
 */
function ringInView(points: Float64Array, start: number, end: number, { e, n, f }: Basis) {
  // Plain scalars in the loop: it runs over every point of the Atlas at startup.
  const [ex, ey, ez, nx, ny, nz, fx, fy, fz] = [...e, ...n, ...f];
  let area = 0;
  let cu = 0;
  let cv = 0;
  let eu = 0;
  let ev = 0;
  let u0 = points[3 * (end - 1)] * ex + points[3 * (end - 1) + 1] * ey + points[3 * (end - 1) + 2] * ez;
  let v0 = points[3 * (end - 1)] * nx + points[3 * (end - 1) + 1] * ny + points[3 * (end - 1) + 2] * nz;
  for (let i = start; i < end; i++) {
    const x = points[3 * i];
    const y = points[3 * i + 1];
    const z = points[3 * i + 2];
    const u1 = x * ex + y * ey + z * ez;
    const v1 = x * nx + y * ny + z * nz;
    const cross = u0 * v1 - u1 * v0;
    area += cross / 2;
    cu += ((u0 + u1) * cross) / 6;
    cv += ((v0 + v1) * cross) / 6;
    // A point on the far side of the globe stretches the ring across the whole view.
    const behind = x * fx + y * fy + z * fz < 0;
    eu = Math.max(eu, behind ? 1 : Math.abs(u1));
    ev = Math.max(ev, behind ? 1 : Math.abs(v1));
    u0 = u1;
    v0 = v1;
  }
  const centroid = area !== 0 ? { u: cu / area, v: cv / area } : { u: 0, v: 0 };
  return { area: Math.abs(area), centroid, extent: { u: eu, v: ev } };
}

function decodeArc(flat: number[]) {
  const n = flat.length / 3;
  const xyz = new Float64Array(n * 3);
  const level = new Uint8Array(n);
  let [lon, lat] = [0, 0];
  for (let i = 0; i < n; i++) {
    lon += flat[3 * i];
    lat += flat[3 * i + 1];
    const λ = ((lon / COORD_SCALE) * Math.PI) / 180;
    const φ = ((lat / COORD_SCALE) * Math.PI) / 180;
    xyz[3 * i] = Math.cos(φ) * Math.cos(λ);
    xyz[3 * i + 1] = Math.cos(φ) * Math.sin(λ);
    xyz[3 * i + 2] = Math.sin(φ);
    level[i] = flat[3 * i + 2];
  }
  return { xyz, level };
}
