// The Regions' source: geoBoundaries, simplified, one GeoJSON file per country: gbOpen ADM1,
// unless the country's entry names another release or level (ADR 0005), where ADM1 groups
// the regions a traveller knows into statistical macro-regions (Italy, Greece…).
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
  /** The geoBoundaries release, gbOpen when absent. */
  release?: 'gbOpen' | 'gbHumanitarian';
  /** The administrative level taken as Regions, ADM1 when absent. */
  level?: 'ADM1' | 'ADM2';
  /** Why this country takes another release or level than gbOpen ADM1. */
  why?: string;
};

export const SOURCES: Source[] = require('./geoboundaries.json');

export type RegionFeature = {
  properties: { shapeName: string; shapeID: string };
  geometry: { type: 'Polygon'; coordinates: number[][][] } | { type: 'MultiPolygon'; coordinates: number[][][][] };
};

export function urlOf({ iso3, commit, release = 'gbOpen', level = 'ADM1' }: Source) {
  return `https://github.com/wmgeolab/geoBoundaries/raw/${commit}/releaseData/${release}/${iso3}/${level}/geoBoundaries-${iso3}-${level}_simplified.geojson`;
}

/** The cached file of a source: a country moved to another release or level is downloaded again. */
export function fileOf({ iso3, release = 'gbOpen', level = 'ADM1' }: Source) {
  return release === 'gbOpen' && level === 'ADM1' ? `${iso3}.geojson` : `${iso3}-${release}-${level}.geojson`;
}

/** GitHub sometimes refuses a stream when many files are asked at once: try again a few times. */
async function fetchFile(url: string, tries = 4): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetch(url);
    } catch (error) {
      if (attempt >= tries) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

/** Downloads the files missing from `dir`, a few at a time. */
export async function download(dir: string, sources = SOURCES) {
  mkdirSync(dir, { recursive: true });
  const queue = sources.filter((s) => !existsSync(join(dir, fileOf(s))));
  const worker = async () => {
    for (let source = queue.shift(); source; source = queue.shift()) {
      const response = await fetchFile(urlOf(source));
      if (!response.ok) throw new Error(`${source.iso3}: ${response.status} for ${urlOf(source)}`);
      writeFileSync(join(dir, fileOf(source)), Buffer.from(await response.arrayBuffer()));
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
}

/** The Region features of a source, from a directory filled by download(). */
export function featuresOf(dir: string, source: Source): RegionFeature[] {
  return JSON.parse(readFileSync(join(dir, fileOf(source)), 'utf8')).features;
}
