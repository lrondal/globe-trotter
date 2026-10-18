// The Atlas: the reference Places shipped with the app, decoded once at startup. The Regions'
// outlines stay out of the JS bundle, as files read when their Country is first selected.
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';

import data from '../../assets/data/countries.json';
import regionIndex from '../../assets/data/regions.json';
import { openAtlas } from './atlas';
import type { CountriesData } from './countries';
import { REGION_FILES } from './regionFiles';
import type { RegionIndex, RegionsData } from './regions';
import type { PlaceRef } from '../journal/journal';

export { footprintOf } from './countries';
export type { CountryGeometry, CountryRecord, Footprint } from './countries';
export type { RegionGeometry, RegionRecord } from './regions';

async function loadRegions(countryId: string): Promise<RegionsData> {
  const [{ localUri }] = await Asset.loadAsync(REGION_FILES[countryId]);
  return JSON.parse(await new File(localUri!).text());
}

export const atlas = openAtlas({ countries: data as CountriesData, regionIndex: regionIndex as RegionIndex, loadRegions });

/** Every Country and Island, by the index the globe draws, hits and frames it with. */
export const { countries, geometry: countryGeometry } = atlas;

/** Each entry of `countries` as the Journal knows it: an Island when it has a Country. */
export const places = countries.map(({ id, countryId }) => ({ level: countryId ? 'island' : 'country', id }) as const);

/** The Place whose Status a Place reaches: a Region's Country. An Island is inside nothing. */
export function containerOf(place: PlaceRef): PlaceRef | null {
  if (place.level !== 'region') return null;
  const region = atlas.region(place.id);
  return region ? { level: 'country', id: region.countryId } : null;
}
