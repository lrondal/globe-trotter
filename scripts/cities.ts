// City pipeline: GeoNames cities1000 -> the Cities the app ships (ADR 0002).
//
// Each City is placed in the Country, Island and Region the Atlas finds at its point, as a
// tap there would: what the globe shows decides, not GeoNames' own codes. A point just off
// the Atlas coast is placed by the nearest land around it, then by its GeoNames country.
import { createRequire } from 'node:module';

import type { Atlas } from '../src/atlas/atlas.ts';
import { fold } from '../src/atlas/cities.ts';

const require = createRequire(import.meta.url);
const iso = require('i18n-iso-countries');

/** A line of cities1000.txt, as far as the app needs it. */
export type GeoNamesCity = { id: string; name: string; lon: number; lat: number; countryCode: string; population: number };

/** A line of alternateNamesV2.txt, as far as the app needs it. */
export type AlternateName = {
  geonameId: string;
  language: string;
  name: string;
  preferred: boolean;
  short: boolean;
  /** Colloquial or historic: never a City's name. */
  unofficial: boolean;
};

export function parseCity(line: string): GeoNamesCity {
  const f = line.split('\t');
  return { id: f[0], name: f[1], lat: Number(f[4]), lon: Number(f[5]), countryCode: f[8], population: Number(f[14]) };
}

export function parseAlternateName(line: string): AlternateName {
  const f = line.split('\t');
  return {
    geonameId: f[1],
    language: f[2],
    name: f[3],
    preferred: f[4] === '1',
    short: f[5] === '1',
    unofficial: f[6] === '1' || f[7] === '1',
  };
}

/** Alternate names in no language, or in English, that a City is also found by (Naoshima, for Honmura). */
const ALIAS_LANGUAGES = new Set(['', 'en']);
/** Aliases kept per City, at most. */
const MAX_ALIASES = 2;
const LATIN = /^[\p{Script=Latin}\p{M}0-9 '’.\-()]+$/u;

/** A City's French name, if GeoNames has one other than its name, and its aliases. */
export function namesOf(city: GeoNamesCity, alternates: AlternateName[]): { french?: string; aliases: string[] } {
  const official = alternates.filter((a) => !a.unofficial);
  const french = official
    .filter((a) => a.language === 'fr')
    .sort((a, b) => Number(b.preferred) - Number(a.preferred) || Number(a.short) - Number(b.short))[0]?.name;
  const seen = new Set([fold(city.name), ...(french ? [fold(french)] : [])]);
  const aliases: string[] = [];
  for (const a of official) {
    if (aliases.length === MAX_ALIASES) break;
    if (!ALIAS_LANGUAGES.has(a.language) || !LATIN.test(a.name) || seen.has(fold(a.name))) continue;
    seen.add(fold(a.name));
    aliases.push(a.name);
  }
  return { french: french && french !== city.name ? french : undefined, aliases };
}

/** Around a point off the coast, the land looked for: rings of this many degrees. */
const NEARBY = [0.01, 0.03, 0.1];
const BEARINGS = 8;

/** The Atlas id of a GeoNames country code, if the Atlas draws it as a Country. */
function atlasIdOf(countryCode: string, atlas: Atlas): string | undefined {
  const id = countryCode === 'XK' ? 'x-kosovo' : iso.alpha2ToNumeric(countryCode);
  return atlas.countries.some((c) => c.id === id && !c.countryId) ? id : undefined;
}

/** Where a City is placed: by its point, by land near it, or by its GeoNames country. */
export type Placement = { place: string; region?: number; by: 'point' | 'nearby' | 'country' };

export async function place(city: GeoNamesCity, atlas: Atlas): Promise<Placement | null> {
  const at = async (lon: number, lat: number) => {
    const found = await atlas.locate({ lon, lat });
    if (!found) return null;
    const placeId = (found.island ?? found.country).id;
    const region = found.region ? atlas.regionsOf(found.country.id).findIndex((r) => r.id === found.region!.id) : -1;
    return region >= 0 ? { place: placeId, region } : { place: placeId };
  };
  const own = await at(city.lon, city.lat);
  if (own) return { ...own, by: 'point' };
  for (const radius of NEARBY) {
    for (let b = 0; b < BEARINGS; b++) {
      const angle = (2 * Math.PI * b) / BEARINGS;
      const lat = city.lat + radius * Math.sin(angle);
      const lon = city.lon + (radius * Math.cos(angle)) / Math.max(0.1, Math.cos((city.lat * Math.PI) / 180));
      const near = await at(lon, lat);
      if (near) return { ...near, by: 'nearby' };
    }
  }
  const country = atlasIdOf(city.countryCode, atlas);
  return country ? { place: country, by: 'country' } : null;
}

/** Degrees kept of a City's point: 1e-4, about 10 m. */
const round = (degrees: number) => String(Math.round(degrees * 1e4) / 1e4);

/** The line of a City in assets/data/cities.tsv (see CitiesData). */
export function lineOf(city: GeoNamesCity, names: ReturnType<typeof namesOf>, placement: Placement): string {
  return [
    city.id,
    city.name,
    names.french ?? '',
    names.aliases.join('|'),
    round(city.lon),
    round(city.lat),
    placement.place,
    placement.region ?? '',
  ].join('\t');
}

/** Most populated first; equal populations by id, so a rebuild orders them the same. */
export const byPopulation = (a: GeoNamesCity, b: GeoNamesCity) => b.population - a.population || Number(a.id) - Number(b.id);
