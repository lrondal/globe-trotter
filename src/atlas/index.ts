// The Atlas: the reference Places shipped with the app, decoded once at startup.
import data from '../../assets/data/countries.json';
import { decodeCountries, type CountriesData } from './countries';

export { footprintOf } from './countries';
export type { CountryGeometry, CountryRecord, Footprint } from './countries';

/** Every Country and Island, by the index the globe draws, hits and frames it with. */
export const { countries, geometry: countryGeometry } = decodeCountries(data as CountriesData);

/** Each entry of `countries` as the Journal knows it: an Island when it has a Country. */
export const places = countries.map(({ id, countryId }) => ({ level: countryId ? 'island' : 'country', id }) as const);
