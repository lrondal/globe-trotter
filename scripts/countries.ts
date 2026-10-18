// Country pipeline: world-atlas 50m -> the Countries the app ships (ids, French names, geometry).
import { createRequire } from 'node:module';
import { geoArea, geoCentroid, geoContains, geoDistance, geoInterpolate } from 'd3-geo';
import { transform } from 'topojson-client';
import { presimplify, sphericalTriangleArea } from 'topojson-simplify';
import type { GeometryCollection, MultiPolygon, Polygon, Topology } from 'topojson-specification';

import {
  COORD_SCALE,
  type CountriesData,
  type CountryData as Country,
  type CountryRecord,
} from '../src/atlas/countries.ts';
import { ISLANDS, type IslandSpec } from './islands.ts';

const require = createRequire(import.meta.url);
const iso = require('i18n-iso-countries');
iso.registerLocale(require('i18n-iso-countries/langs/fr.json'));

type WorldAtlas = Topology<{ countries: GeometryCollection<{ name: string }> }>;

/** Longest segment kept as is, in degrees: longer ones (straight borders) are densified. */
const MAX_SEGMENT_DEG = 0.5;

// i18n-iso-countries' French names, where the short everyday name reads better in the UI.
const NAME_OVERRIDES: Record<string, string> = {
  '840': 'États-Unis',
  '784': 'Émirats arabes unis',
  '834': 'Tanzanie',
  '748': 'Eswatini',
  '203': 'Tchéquie',
  '214': 'République dominicaine',
  '140': 'République centrafricaine',
  '384': "Côte d'Ivoire",
  '096': 'Brunei',
  '336': 'Vatican',
  '850': 'Îles Vierges des États-Unis',
  '092': 'Îles Vierges britanniques',
  '086': "Territoire britannique de l'océan Indien",
  '260': 'Terres australes et antarctiques françaises',
};

// Map entities with no ISO 3166-1 code, keyed by their world-atlas name. Their ids are stable:
// the Journal stores them, so never rename one.
const NO_ISO_CODE: Record<string, CountryRecord> = {
  Kosovo: { id: 'x-kosovo', name: 'Kosovo' },
  Somaliland: { id: 'x-somaliland', name: 'Somaliland' },
  'N. Cyprus': { id: 'x-northern-cyprus', name: 'Chypre du Nord' },
  'Indian Ocean Ter.': { id: 'x-indian-ocean-territories', name: "Territoires australiens de l'océan Indien" },
  'Siachen Glacier': { id: 'x-siachen-glacier', name: 'Glacier de Siachen' },
};

// ISO 3166-1 entries the 50m map does not draw on their own. Any other ISO code missing from
// the map fails the build.
export const NOT_ON_THE_MAP: Record<string, string> = {
  '074': 'Bouvet Island: not in the 50m map',
  '162': 'Christmas Island: part of x-indian-ocean-territories',
  '166': 'Cocos Islands: part of x-indian-ocean-territories',
  '175': 'Mayotte: drawn as part of France, carved out as an Island',
  '254': 'French Guiana: drawn as part of France, carved out as an Island',
  '312': 'Guadeloupe: drawn as part of France, carved out as an Island',
  '474': 'Martinique: drawn as part of France, carved out as an Island',
  '638': 'Réunion: drawn as part of France, carved out as an Island',
  '292': 'Gibraltar: not in the 50m map',
  '535': 'Bonaire, Sint Eustatius and Saba: drawn as part of the Netherlands',
  '581': 'U.S. Minor Outlying Islands: not in the 50m map',
  '744': 'Svalbard and Jan Mayen: drawn as part of Norway',
  '772': 'Tokelau: not in the 50m map',
  '798': 'Tuvalu: not in the 50m map',
  '983': 'Kosovo: drawn as x-kosovo',
};

export function buildCountries(world: WorldAtlas, islands: IslandSpec[] = ISLANDS): CountriesData {
  const onMap = new Set(world.objects.countries.geometries.map((g) => String(g.id)));
  const missing = Object.keys(iso.getNumericCodes()).filter((n) => !onMap.has(n) && !(n in NOT_ON_THE_MAP));
  if (missing.length > 0) {
    const names = missing.map((n) => `${n} ${iso.getName(iso.numericToAlpha2(n), 'fr')}`);
    throw new Error(`countries missing from the map: ${names.join(', ')}`);
  }

  // Several map geometries can share one ISO code (Australia and the Ashmore and Cartier
  // Islands are both 036): they make a single Country.
  const byId = new Map<string, Country>();
  for (const geometry of world.objects.countries.geometries) {
    const record = recordFor(geometry.id, (geometry.properties as { name: string }).name);
    const country = byId.get(record.id) ?? { ...record, polygons: [] };
    byId.set(record.id, country);
    if (geometry.type === 'Polygon') country.polygons.push((geometry as Polygon).arcs);
    else if (geometry.type === 'MultiPolygon') country.polygons.push(...(geometry as MultiPolygon).arcs);
  }
  const arcs = levelledArcs(world);
  const countries = [...byId.values(), ...carveIslands(islands, byId, arcs)];
  for (const country of countries) checkOutline(country, arcs);
  return { countries, arcs: arcs.map(encodeArc) };
}

/** Takes each Island's polygons out of its Country, into an entity of its own. */
function carveIslands(islands: IslandSpec[], byId: Map<string, Country>, arcs: Point[][]): Country[] {
  const shapes = new Map<Country, ReturnType<typeof polygonShape>[]>();
  const shapesOf = (country: Country) => {
    if (!shapes.has(country)) shapes.set(country, country.polygons.map((p) => polygonShape(p, arcs)));
    return shapes.get(country)!;
  };
  /** The Island that claimed each polygon, found against the Countries before any carving. */
  const claimedBy = new Map<number[][], string>();
  const carved = islands.map((island) => {
    const country = byId.get(island.countryId);
    if (!country) throw new Error(`${island.id}: no Country ${island.countryId}`);
    const own = shapesOf(country);
    const taken = new Set<number>();
    for (const point of island.points) {
      const k = own.findIndex((shape) => geoContains(shape, point));
      if (k < 0) throw new Error(`${island.id}: [${point}] is in no polygon of ${country.name}`);
      taken.add(k);
    }
    if (island.box) {
      const box = island.box;
      const before = taken.size;
      own.forEach((shape, k) => inBox(box, geoCentroid(shape)) && taken.add(k));
      if (taken.size === before) throw new Error(`${island.id}: its box holds no other polygon of ${country.name}`);
    }
    const polygons = [...taken].map((k) => country.polygons[k]);
    for (const polygon of polygons) {
      const other = claimedBy.get(polygon);
      if (other) throw new Error(`${island.id} claims a polygon of ${other}`);
      claimedBy.set(polygon, island.id);
    }
    return { id: island.id, name: island.name, countryId: country.id, polygons };
  });
  for (const country of byId.values()) country.polygons = country.polygons.filter((p) => !claimedBy.has(p));
  return carved;
}

/** Whether a point is in a box; a box whose west edge is east of its east edge crosses the antimeridian. */
function inBox([west, south, east, north]: NonNullable<IslandSpec['box']>, [lon, lat]: [number, number]) {
  return lat >= south && lat <= north && (west <= east ? lon >= west && lon <= east : lon >= west || lon <= east);
}

/** A polygon of arc indices as a GeoJSON Polygon in degrees. */
function polygonShape(polygon: number[][], arcs: Point[][]) {
  return { type: 'Polygon' as const, coordinates: polygon.map((ring) => ringCoordinates(ring, arcs)) };
}

function ringCoordinates(indices: number[], arcs: Point[][]): [number, number][] {
  return indices.flatMap((i) => {
    const arc = i < 0 ? [...arcs[~i]].reverse() : arcs[i];
    return arc.map(([lon, lat]): [number, number] => [lon, lat]);
  });
}

export type Point = [lon: number, lat: number, area: number];

/** Absolute, densified arcs whose points carry their spherical Visvalingam area. */
function levelledArcs(world: WorldAtlas): Point[][] {
  const toLonLat = transform(world.transform!);
  return levelArcs(world.arcs.map((arc) => arc.map((p, i) => toLonLat(p, i > 0) as [number, number])));
}

/** Densifies arcs in degrees and gives each point its spherical Visvalingam area. */
export function levelArcs(arcs: [number, number][][]): Point[][] {
  const topology = { type: 'Topology', objects: {}, arcs: arcs.map(densify) } as unknown as Parameters<typeof presimplify>[0];
  return presimplify(topology, sphericalTriangleArea).arcs as unknown as Point[][];
}

function densify(arc: [number, number][]): [number, number][] {
  const out: [number, number][] = [arc[0]];
  for (let i = 1; i < arc.length; i++) {
    const [a, b] = [arc[i - 1], arc[i]];
    // Natural Earth draws straight borders as straight lon/lat lines (e.g. the 49th parallel):
    // interpolate along them, unless the segment crosses the antimeridian.
    const crosses = Math.abs(b[0] - a[0]) > 180;
    const along = crosses ? geoInterpolate(a, b) : (t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const steps = Math.ceil((geoDistance(a, b) * 180) / Math.PI / MAX_SEGMENT_DEG);
    for (let s = 1; s < steps; s++) out.push(along(s / steps) as [number, number]);
    out.push(b);
  }
  return out;
}

/** The level of a point of Visvalingam area `area` (see CountriesData): arc ends are 0. */
export function levelOf(area: number) {
  return Number.isFinite(area) ? Math.min(255, Math.max(1, Math.floor(-2 * Math.log2(area || 1e-30)))) : 0;
}

/** An arc in the CountriesData encoding. */
export function encodeArc(arc: Point[]): number[] {
  const flat: number[] = [];
  let [lon0, lat0] = [0, 0];
  for (const [lon, lat, area] of arc) {
    const [lon1, lat1] = [Math.round(lon * COORD_SCALE), Math.round(lat * COORD_SCALE)];
    const level = levelOf(area);
    flat.push(lon1 - lon0, lat1 - lat0, level);
    [lon0, lat0] = [lon1, lat1];
  }
  return flat;
}

/** Coherence check: a Country is a real outline, wound so that it covers less than a hemisphere. */
function checkOutline(country: Country, arcs: Point[][]) {
  const geometry = {
    type: 'MultiPolygon' as const,
    coordinates: country.polygons.map((p) => polygonShape(p, arcs).coordinates),
  };
  const area = geoArea(geometry);
  if (country.polygons.length === 0 || area === 0 || area > 2 * Math.PI) {
    throw new Error(`${country.id} ${country.name}: no outline or an inverted one (area ${area} sr)`);
  }
}

function recordFor(isoNumeric: string | number | undefined, mapName: string): CountryRecord {
  if (isoNumeric === undefined) {
    const record = NO_ISO_CODE[mapName];
    if (!record) throw new Error(`"${mapName}" has no ISO code and no x- id: add it to NO_ISO_CODE`);
    return record;
  }
  const id = String(isoNumeric);
  const name = NAME_OVERRIDES[id] ?? iso.getName(iso.numericToAlpha2(id), 'fr');
  if (!name) throw new Error(`no French name for ISO ${id} ("${mapName}")`);
  return { id, name };
}
