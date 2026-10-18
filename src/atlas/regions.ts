// The Regions shipped with the app (made by scripts/regions.ts): an index of every Region,
// small enough for the JS bundle (assets/data/regions.json), and the outlines of each
// Country's Regions in a file of their own, loaded when the Country is selected.
import { decodeCountries, type CountryData, type CountryGeometry } from './countries.ts';

/** A Region: its geoBoundaries shapeID, name, Country, and the centre of its largest polygon. */
export type RegionRecord = { id: string; name: string; countryId: string; lon: number; lat: number };

/** Every Region, by Country id. */
export type RegionIndex = Record<string, Omit<RegionRecord, 'countryId'>[]>;

/** The outlines of one Country's Regions, in the encoding of CountriesData. */
export type RegionsData = { regions: CountryData[]; arcs: number[][] };

/** A Country's Regions ready to draw and hit, like the Countries (see CountryGeometry). */
export type RegionGeometry = { regions: { id: string; name: string }[]; geometry: CountryGeometry };

export function decodeRegions(data: RegionsData): RegionGeometry {
  const { countries, geometry } = decodeCountries({ countries: data.regions, arcs: data.arcs });
  return { regions: countries.map(({ id, name }) => ({ id, name })), geometry };
}
