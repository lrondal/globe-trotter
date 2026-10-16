// PROTOTYPE: globe geometry, culling, hit-testing and Skia path building.
import { geoArea, geoCentroid, geoContains, geoDistance, geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { Skia, type SkPath } from '@shopify/react-native-skia';
import { REGIONS } from './regionIndex';

const COUNTRIES: Record<string, { iso3: string; name: string }> = require('../assets/data/countries.json');

export type Shape = {
  key: string;
  name: string;
  f: any;
  centroid: [number, number]; // of the whole feature, for culling
  radius: number; // angular radius (rad) around centroid
  main: any; // largest polygon, for fly-to
};

export type Renderer = 'svg' | 'builder';

function rewind(f: any) {
  if (geoArea(f) <= 2 * Math.PI) return f;
  const rev = (poly: number[][][]) => poly.map((r) => r.slice().reverse());
  const g = f.geometry;
  if (g.type === 'Polygon') g.coordinates = rev(g.coordinates);
  else if (g.type === 'MultiPolygon') g.coordinates = g.coordinates.map(rev);
  return f;
}

function mainPolygon(f: any) {
  if (f.geometry.type !== 'MultiPolygon') return f;
  let best: any = null;
  let a = -1;
  for (const c of f.geometry.coordinates) {
    const p = { type: 'Polygon', coordinates: c };
    const x = geoArea(p as any);
    if (x > a) { a = x; best = p; }
  }
  return best;
}

function prepare(features: any[], keyOf: (f: any) => string, nameOf: (f: any) => string): Shape[] {
  return features.filter((f) => f.geometry).map((f) => {
    rewind(f);
    const centroid = geoCentroid(f) as [number, number];
    let radius = 0;
    const g = f.geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    for (const poly of polys) for (const ring of poly) for (const pt of ring) {
      const d = geoDistance(centroid, pt as [number, number]);
      if (d > radius) radius = d;
    }
    return { key: keyOf(f), name: nameOf(f), f, centroid, radius, main: mainPolygon(f) };
  });
}

export function loadWorld(res: '50m' | '110m'): Shape[] {
  const topo = res === '50m' ? require('../assets/data/world-50m.json') : require('../assets/data/world-110m.json');
  const fs = (feature(topo, topo.objects.countries) as any).features;
  return prepare(fs, (f) => f.id ?? 'x-' + f.properties.name, (f) => COUNTRIES[f.id]?.name ?? f.properties.name);
}

export function countryIso3(id: string) {
  return COUNTRIES[id]?.iso3;
}

const regionCache: Record<string, Shape[] | null> = {};
export function loadRegions(id: string): Shape[] | null {
  if (id in regionCache) return regionCache[id];
  const a3 = countryIso3(id);
  const load = a3 && REGIONS[a3];
  if (!load) return (regionCache[id] = null);
  const topo = load();
  const obj = topo.objects[Object.keys(topo.objects)[0]];
  const fs = (feature(topo, obj) as any).features;
  return (regionCache[id] = prepare(fs, (f) => f.properties.id ?? f.properties.name, (f) => f.properties.name));
}

export type View = { lam: number; phi: number; k: number };

export function makeProjection(v: View, W: number, H: number, cy: number) {
  const R = (Math.min(W, H) / 2) * 0.9;
  return geoOrthographic().clipAngle(90).precision(0).rotate([v.lam, v.phi]).scale(R * v.k).translate([W / 2, cy]);
}

export function baseRadius(W: number, H: number) {
  return (Math.min(W, H) / 2) * 0.9;
}

/** Visible test: hemisphere facing us, narrowed to the screen when zoomed in. */
export function makeCull(proj: any, W: number, H: number, cy: number) {
  const r = proj.rotate();
  const center: [number, number] = [-r[0], -r[1]];
  const halfDiag = Math.hypot(W / 2, Math.max(cy, H - cy));
  const scale = proj.scale();
  const screenAngle = scale > halfDiag ? Math.asin(halfDiag / scale) : Math.PI / 2;
  const lim = Math.min(Math.PI / 2, screenAngle);
  return (s: Shape) => geoDistance(s.centroid, center) < lim + s.radius;
}

export type BuildStats = { drawn: number; ms: number };

/** Builds one SkPath per group. `groupOf` returns null to skip a shape. */
export function buildPaths(
  proj: any,
  shapes: Shape[],
  groupOf: (s: Shape) => string | null,
  visible: (s: Shape) => boolean,
  renderer: Renderer,
  stats: BuildStats,
): Record<string, SkPath> {
  const out: Record<string, SkPath> = {};
  if (renderer === 'svg') {
    const p = (geoPath(proj) as any).digits(1);
    const parts: Record<string, string[]> = {};
    for (const s of shapes) {
      const g = groupOf(s);
      if (g == null || !visible(s)) continue;
      const d = p(s.f);
      if (!d) continue;
      stats.drawn++;
      (parts[g] ??= []).push(d);
    }
    for (const g in parts) out[g] = Skia.Path.MakeFromSVGString(parts[g].join('')) ?? Skia.Path.Make();
    return out;
  }
  const builders: Record<string, any> = {};
  let b: any = null;
  const ctx = {
    moveTo: (x: number, y: number) => b.moveTo(x, y),
    lineTo: (x: number, y: number) => b.lineTo(x, y),
    closePath: () => b.close(),
    arc: () => {},
  };
  const p = geoPath(proj, ctx as any);
  for (const s of shapes) {
    const g = groupOf(s);
    if (g == null || !visible(s)) continue;
    b = builders[g] ??= Skia.PathBuilder.Make();
    p(s.f);
    stats.drawn++;
  }
  for (const g in builders) out[g] = builders[g].build();
  return out;
}

const graticule = geoGraticule10();
export function graticulePath(proj: any) {
  return Skia.Path.MakeFromSVGString((geoPath(proj) as any).digits(1)(graticule) ?? '') ?? Skia.Path.Make();
}

/** Country (or region) under a screen point. `tolerance` > 0 also samples a ring around the point. */
export function hitTest(proj: any, shapes: Shape[], x: number, y: number, tolerance: number): Shape | null {
  const at = (px: number, py: number) => {
    const ll = proj.invert([px, py]);
    if (!ll || Number.isNaN(ll[0]) || Number.isNaN(ll[1])) return null;
    // invert() also answers for the far hemisphere; reject points not facing us
    const r = proj.rotate();
    if (geoDistance(ll, [-r[0], -r[1]]) > Math.PI / 2) return null;
    for (const s of shapes) if (geoDistance(s.centroid, ll) <= s.radius && geoContains(s.f, ll)) return s;
    return null;
  };
  const direct = at(x, y);
  if (direct || tolerance <= 0) return direct;
  for (const rad of [tolerance / 2, tolerance]) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const s = at(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
      if (s) return s;
    }
  }
  return null;
}

/** Zoom that fits a shape's largest polygon into `aw`×`ah` px. */
export function fitZoom(s: Shape, W: number, H: number, aw: number, ah: number, pad = 0.78) {
  const c = geoCentroid(s.main) as [number, number];
  const tp = geoOrthographic().clipAngle(90).rotate([-c[0], -c[1]]).scale(1).translate([0, 0]);
  const b = geoPath(tp).bounds(s.main);
  const bw = Math.max(1e-4, b[1][0] - b[0][0]);
  const bh = Math.max(1e-4, b[1][1] - b[0][1]);
  const k = Math.min((aw * pad) / bw, (ah * pad) / bh) / baseRadius(W, H);
  return { lon: c[0], lat: c[1], k: Math.max(1, Math.min(24, k)) };
}
