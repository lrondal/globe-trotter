// Region pipeline: geoBoundaries ADM1 -> the Regions of each Country the app ships.
//
// Each Region is cut to the outline of its Country in the Atlas, Islands already carved out:
// Regions then fill their Country exactly, without spilling over its coast or its borders,
// and a Region made of Islands (Corse, Illes Balears) is left with nothing and dropped
// (ADR 0003), so that a tap on an Island always finds the Island.
import { createRequire } from 'node:module';
import polygonClipping, { type MultiPolygon } from 'polygon-clipping';
import { topology } from 'topojson-server';
import type { Topology } from 'topojson-specification';

import { COORD_SCALE, type CountriesData, type CountryData } from '../src/atlas/countries.ts';
import { decodeRegions, type RegionIndex, type RegionsData } from '../src/atlas/regions.ts';
import { encodeArc, levelArcs, levelOf, NOT_ON_THE_MAP } from './countries.ts';
import { SOURCES, type RegionFeature, type Source } from './geoboundaries.ts';

const require = createRequire(import.meta.url);
const iso = require('i18n-iso-countries');

/** A Region keeping less than this share of its area in its Country is dropped: it is made of Islands. */
const MIN_KEPT = 0.1;
/** Pieces of a Region smaller than this, in square degrees at the equator (~1 km²), are dropped. */
const MIN_PIECE = 1e-4;
/**
 * The finest level the globe ever draws: zoom 24, fine detail (0.1 pt²), on a 440 pt wide
 * iPhone. Finer points are never seen, so they are not shipped.
 */
const MAX_LEVEL = 55;

/** Atlas Countries cut from a geoBoundaries country they share, besides its own. */
const ALSO_FROM: Record<string, string[]> = {
  SOM: ['x-somaliland'],
  CYP: ['x-northern-cyprus'],
};

/** Map entities without gbOpen ADM1. */
const NO_ADM1 = 'no gbOpen ADM1';

// Atlas Countries without Regions. Any other Country left without Regions fails the build.
export const NO_REGIONS: Record<string, string> = {
  '010': NO_ADM1, // Antarctique
  '016': NO_ADM1, // Samoa américaines
  '060': NO_ADM1, // Bermudes
  '086': NO_ADM1, // Territoire britannique de l'océan Indien
  '092': NO_ADM1, // Îles Vierges britanniques
  '136': NO_ADM1, // Îles Caïmans
  '184': NO_ADM1, // Îles Cook
  '234': NO_ADM1, // Îles Féroé
  '238': NO_ADM1, // Îles Malouines
  '239': NO_ADM1, // Géorgie du Sud-et-les Îles Sandwich du Sud
  '248': NO_ADM1, // Åland
  '258': NO_ADM1, // Polynésie française
  '260': NO_ADM1, // Terres australes et antarctiques françaises
  '316': NO_ADM1, // Guam
  '334': NO_ADM1, // Îles Heard-et-MacDonald
  '336': NO_ADM1, // Vatican
  '344': NO_ADM1, // Hong Kong
  '446': NO_ADM1, // Macao
  '492': 'its one ADM1 is smaller than the smallest piece kept',
  '500': NO_ADM1, // Montserrat
  '531': NO_ADM1, // Curaçao
  '533': NO_ADM1, // Aruba
  '534': NO_ADM1, // Saint-Martin (partie néerlandaise)
  '540': NO_ADM1, // Nouvelle-Calédonie
  '574': NO_ADM1, // Île Norfolk
  '580': NO_ADM1, // Îles Mariannes du Nord
  '612': NO_ADM1, // Îles Pitcairn
  '630': NO_ADM1, // Porto Rico
  '652': NO_ADM1, // Saint-Barthélemy
  '654': NO_ADM1, // Sainte-Hélène
  '660': NO_ADM1, // Anguilla
  '663': NO_ADM1, // Saint-Martin (partie française)
  '666': NO_ADM1, // Saint-Pierre-et-Miquelon
  '732': NO_ADM1, // Sahara occidental
  '796': NO_ADM1, // Îles Turques-et-Caïques
  '831': NO_ADM1, // Guernesey
  '832': NO_ADM1, // Jersey
  '833': NO_ADM1, // Île de Man
  '850': NO_ADM1, // Îles Vierges des États-Unis
  '876': NO_ADM1, // Wallis-et-Futuna
  'x-indian-ocean-territories': NO_ADM1,
  'x-siachen-glacier': NO_ADM1,
};

/** The Atlas id of a geoBoundaries country. */
function atlasId(iso3: string): string {
  if (iso3 === 'XKX') return 'x-kosovo';
  const numeric = iso.alpha3ToNumeric(iso3);
  if (!numeric) throw new Error(`${iso3}: not an ISO 3166-1 code`);
  return numeric;
}

export type BuiltRegions = {
  index: RegionIndex;
  /** The outlines of each Country's Regions, by Country id. */
  files: Map<string, RegionsData>;
};

export function buildRegions(
  atlas: CountriesData,
  featuresOf: (iso3: string) => RegionFeature[],
  sources: Source[] = SOURCES,
): BuiltRegions {
  const arcs = atlas.arcs.map(decodeArc);
  const byId = new Map(atlas.countries.filter((c) => !c.countryId).map((c) => [c.id, c]));
  const outlines = new Map<string, { shape: MultiPolygon; box: Box }>();
  const outlineOf = (id: string) => {
    if (!outlines.has(id)) {
      const country = byId.get(id);
      if (!country) throw new Error(`no Country ${id} in the Atlas`);
      const shape = country.polygons.map((polygon) => polygon.map((ring) => ringOf(ring, arcs)));
      outlines.set(id, { shape, box: boxOf(shape) });
    }
    return outlines.get(id)!;
  };

  /** Each Country's Regions, cut to its outline. */
  const kept = new Map<string, { id: string; name: string; shape: MultiPolygon }[]>();
  const seen = new Set<string>();
  for (const source of sources) {
    // Tuvalu, say: no outline to cut its Regions to.
    if (atlasId(source.iso3) in NOT_ON_THE_MAP) continue;
    const candidates = [atlasId(source.iso3), ...(ALSO_FROM[source.iso3] ?? [])];
    for (const feature of featuresOf(source.iso3)) {
      const { shapeID: id, shapeName: name } = feature.properties;
      if (seen.has(id)) throw new Error(`${source.iso3}: Region ${id} twice`);
      seen.add(id);
      const shape = shapeOf(feature);
      const box = boxOf(shape);
      // The Country that holds most of the Region gets it.
      let best: { countryId: string; shape: MultiPolygon; area: number } | null = null;
      for (const countryId of candidates) {
        const outline = outlineOf(countryId);
        if (!overlaps(box, outline.box)) continue;
        const cut = polygonClipping
          .intersection(shape, outline.shape)
          .filter((polygon) => areaOf([polygon]) >= MIN_PIECE);
        const area = areaOf(cut);
        if (!best || area > best.area) best = { countryId, shape: cut, area };
      }
      if (!best || best.area < MIN_KEPT * areaOf(shape)) continue;
      kept.set(best.countryId, [...(kept.get(best.countryId) ?? []), { id, name, shape: best.shape }]);
    }
  }

  const index: RegionIndex = {};
  const files = new Map<string, RegionsData>();
  for (const [countryId, regions] of kept) {
    const data = encodeRegions(regions);
    files.set(countryId, data);
    const { regions: decoded, geometry } = decodeRegions(data);
    index[countryId] = decoded.map(({ id, name }, r) => ({
      id,
      name,
      lon: round(geometry.footprints[4 * r]),
      lat: round(geometry.footprints[4 * r + 1]),
    }));
  }
  return { index, files };
}

/**
 * Coherence check: every Country of the Atlas has Regions, unless NO_REGIONS says why not,
 * and every Region is in its Country's file.
 */
export function checkRegions(atlas: CountriesData, { index, files }: BuiltRegions) {
  for (const country of atlas.countries) {
    if (country.countryId) continue;
    const has = (index[country.id]?.length ?? 0) > 0;
    if (!has && !(country.id in NO_REGIONS)) throw new Error(`${country.id} ${country.name} has no Regions`);
    if (has && country.id in NO_REGIONS) throw new Error(`${country.id} ${country.name} has Regions: take it out of NO_REGIONS`);
  }
  for (const [countryId, regions] of Object.entries(index)) {
    const shipped = files.get(countryId)?.regions.map((r) => r.id).join();
    if (shipped !== regions.map((r) => r.id).join()) throw new Error(`${countryId}: index and file disagree`);
  }
}

/** Regions as shared, levelled arcs: neighbours keep the same border at every level of detail. */
function encodeRegions(regions: { id: string; name: string; shape: MultiPolygon }[]): RegionsData {
  // Rounded to the shipped precision first, so a border cut out twice ends up identical.
  const geometries = Object.fromEntries(
    regions.map(({ id, shape }) => [id, { type: 'MultiPolygon' as const, coordinates: shape.map(roundPolygon) }]),
  );
  const topo = topology(geometries) as unknown as Topology & { arcs: [number, number][][] };
  const levelled = levelArcs(topo.arcs).map((arc) => arc.filter(([, , area]) => levelOf(area) <= MAX_LEVEL));
  const polygonsOf = (id: string): number[][][] => {
    const object = topo.objects[id] as { type: string; arcs?: number[][][] | number[][] };
    if (object.type === 'Polygon') return [object.arcs as number[][]];
    return (object.arcs as number[][][]) ?? [];
  };
  const out: CountryData[] = regions.map(({ id, name }) => ({ id, name, polygons: polygonsOf(id) }));
  return { regions: out, arcs: levelled.map(encodeArc) };
}

type Box = [west: number, south: number, east: number, north: number];

function boxOf(shape: MultiPolygon): Box {
  const box: Box = [Infinity, Infinity, -Infinity, -Infinity];
  for (const polygon of shape) {
    for (const [lon, lat] of polygon[0]) {
      box[0] = Math.min(box[0], lon);
      box[1] = Math.min(box[1], lat);
      box[2] = Math.max(box[2], lon);
      box[3] = Math.max(box[3], lat);
    }
  }
  return box;
}

const overlaps = (a: Box, b: Box) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];

/** Area in square degrees scaled by the cosine of the latitude: enough to compare pieces. */
function areaOf(shape: MultiPolygon): number {
  let total = 0;
  for (const polygon of shape) {
    polygon.forEach((ring, k) => {
      let area = 0;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const cos = Math.cos((((ring[i][1] + ring[j][1]) / 2) * Math.PI) / 180);
        area += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]) * cos;
      }
      total += (k === 0 ? 1 : -1) * Math.abs(area / 2);
    });
  }
  return total;
}

function shapeOf({ geometry }: RegionFeature): MultiPolygon {
  return (geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates) as MultiPolygon;
}

/** A polygon at the shipped precision, without the repeated points rounding leaves. */
function roundPolygon(polygon: MultiPolygon[number]) {
  return polygon
    .map((ring) => {
      const out: [number, number][] = [];
      for (const [lon, lat] of ring) {
        const point: [number, number] = [round(lon), round(lat)];
        const last = out[out.length - 1];
        if (!last || last[0] !== point[0] || last[1] !== point[1]) out.push(point);
      }
      return out;
    })
    .filter((ring) => ring.length >= 4);
}

const round = (degrees: number) => Math.round(degrees * COORD_SCALE) / COORD_SCALE;

/** An arc of CountriesData as absolute lon, lat points. */
function decodeArc(flat: number[]): [number, number][] {
  const out: [number, number][] = [];
  let [lon, lat] = [0, 0];
  for (let i = 0; i < flat.length; i += 3) {
    lon += flat[i];
    lat += flat[i + 1];
    out.push([lon / COORD_SCALE, lat / COORD_SCALE]);
  }
  return out;
}

/** A closed ring of points from arc indices (`~i` walks arc i backwards). */
function ringOf(indices: number[], arcs: [number, number][][]): [number, number][] {
  const ring: [number, number][] = [];
  indices.forEach((index, a) => {
    const arc = index < 0 ? [...arcs[~index]].reverse() : arcs[index];
    ring.push(...(a === 0 ? arc : arc.slice(1)));
  });
  return ring;
}
