// The Countries shipped with the app (assets/data/countries.json, made by scripts/countries.ts).

export type CountryRecord = { id: string; name: string };

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
};

export function decodeCountries(data: CountriesData): {
  countries: CountryRecord[];
  geometry: CountryGeometry;
} {
  const arcs = data.arcs.map(decodeArc);
  const xyz: number[] = [];
  const level: number[] = [];
  const ringStart: number[] = [];
  const ringCountry: number[] = [];

  data.countries.forEach((country, c) => {
    for (const polygon of country.polygons) {
      for (const ring of polygon) {
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

  return {
    countries: data.countries.map(({ id, name }) => ({ id, name })),
    geometry: {
      xyz: points,
      level: new Uint8Array(level),
      ringStart: new Int32Array(ringStart),
      ringCap,
      ringCountry: new Int32Array(ringCountry),
      maxRing,
    },
  };
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
