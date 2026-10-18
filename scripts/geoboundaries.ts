// The Regions' source: geoBoundaries gbOpen ADM1, simplified, one GeoJSON file per country.
// geoboundaries.json pins each country to the geoBoundaries release commit it was taken from,
// so its shapeIDs, which the Journal stores as Region ids, never change under a rebuild.
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);

export type Source = {
  /** ISO 3166-1 alpha-3 code, as geoBoundaries names its countries (Kosovo is XKX). */
  iso3: string;
  /** The geoBoundaries commit holding the file. */
  commit: string;
  /** Varies by country: the Profile credits them (#2). */
  license: string;
  source: string;
};

export const SOURCES: Source[] = require('./geoboundaries.json');

export type RegionFeature = {
  properties: { shapeName: string; shapeID: string };
  geometry: { type: 'Polygon'; coordinates: number[][][] } | { type: 'MultiPolygon'; coordinates: number[][][][] };
};

const urlOf = ({ iso3, commit }: Source) =>
  `https://github.com/wmgeolab/geoBoundaries/raw/${commit}/releaseData/gbOpen/${iso3}/ADM1/geoBoundaries-${iso3}-ADM1_simplified.geojson`;

/** Downloads the files missing from `dir`, a few at a time. */
export async function download(dir: string, sources = SOURCES) {
  mkdirSync(dir, { recursive: true });
  const queue = sources.filter((s) => !existsSync(join(dir, `${s.iso3}.geojson`)));
  const worker = async () => {
    for (let source = queue.shift(); source; source = queue.shift()) {
      const response = await fetch(urlOf(source));
      if (!response.ok) throw new Error(`${source.iso3}: ${response.status} for ${urlOf(source)}`);
      writeFileSync(join(dir, `${source.iso3}.geojson`), Buffer.from(await response.arrayBuffer()));
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
}

/** The ADM1 features of a country, from a directory filled by download(). */
export function featuresOf(dir: string, iso3: string): RegionFeature[] {
  return JSON.parse(readFileSync(join(dir, `${iso3}.geojson`), 'utf8')).features;
}
