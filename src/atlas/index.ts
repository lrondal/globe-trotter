// The Atlas: the reference Places shipped with the app, decoded once at startup.
import data from '../../assets/data/countries.json';
import { decodeCountries, type CountriesData } from './countries';

export type { CountryGeometry, CountryRecord } from './countries';

export const { countries, geometry: countryGeometry } = decodeCountries(data as CountriesData);
