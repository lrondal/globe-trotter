// The Atlas: the reference Places shipped with the app, decoded once at startup. The Regions'
// outlines and the Cities stay out of the JS bundle, as files read when first asked for: a
// Country's Regions when it is selected, the Cities soon after launch, for the search.
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';

import data from '../../assets/data/countries.json';
import regionIndex from '../../assets/data/regions.json';
import { openAtlas } from './atlas';
import type { CountriesData } from './countries';
import { REGION_FILES } from './regionFiles';
import type { RegionIndex, RegionsData } from './regions';
import type { City, PlaceRef } from '../journal/journal';
import type { CityRecord } from './cities';

export type { CityMatch, SearchResults } from './atlas';
export type { CityRecord } from './cities';
export { footprintOf } from './countries';
export type { CountryGeometry, CountryRecord, Footprint } from './countries';
export type { RegionGeometry, RegionRecord } from './regions';

async function loadRegions(countryId: string): Promise<RegionsData> {
  const [{ localUri }] = await Asset.loadAsync(REGION_FILES[countryId]);
  return JSON.parse(await new File(localUri!).text());
}

/** Bundled as a file (metro.config.js), read when the Cities are first asked for. */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CITIES_FILE: number = require('../../assets/data/cities.tsv');

async function loadCities(): Promise<string> {
  const [{ localUri }] = await Asset.loadAsync(CITIES_FILE);
  return new File(localUri!).text();
}

export const atlas = openAtlas({
  countries: data as CountriesData,
  regionIndex: regionIndex as RegionIndex,
  loadRegions,
  loadCities,
});

/** Every Country and Island, by the index the globe draws, hits and frames it with. */
export const { countries, geometry: countryGeometry } = atlas;

/** Each entry of `countries` as the Journal knows it: an Island when it has a Country. */
export const places = countries.map(({ id, countryId }) => ({ level: countryId ? 'island' : 'country', id }) as const);

/** A City of the list by id, as the Journal would keep it; null until the Cities are loaded. */
export function listedCity(id: string): City | null {
  const listed = atlas.city(id);
  return listed ? cityPlace(listed) : null;
}

/** A City of the list, as the Journal keeps it once it enters it. */
export function cityPlace({ id, name, lon, lat, countryId, islandId, regionId }: CityRecord): City {
  return { level: 'city', id, name, lon, lat, countryId, ...(islandId && { islandId }), ...(regionId && { regionId }) };
}

/**
 * The Place whose Status a Place reaches: a Region's Country. An Island is inside nothing;
 * a City's is the Journal's to tell, from what it keeps of the City.
 */
export function containerOf(place: PlaceRef): PlaceRef | null {
  if (place.level !== 'region') return null;
  const region = atlas.region(place.id);
  return region ? { level: 'country', id: region.countryId } : null;
}
