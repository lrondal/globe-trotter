// The Cities shipped with the app (assets/data/cities.tsv, made by scripts/cities.ts): GeoNames
// cities1000, one City per line, from the most populated down (ADR 0002). Only the order
// keeps the population: search ranks by it, nothing shows it.

/** A City of the built-in list. Its id is its GeoNames id. */
export type CityRecord = {
  id: string;
  /** The French name when GeoNames has one, else the local name. */
  name: string;
  /** Other names it is found by: its local name under a French one, and a few Latin-script alternates (Naoshima). */
  aliases: string[];
  lon: number;
  lat: number;
  countryId: string;
  /** The Island it is on, if any: then it is in no Region. */
  islandId?: string;
  regionId?: string;
};

/**
 * One City per line, tab-separated: id, name, French name (empty when the same), aliases
 * (`|`-separated), lon, lat, the Country or Island it is in, and the index of its Region
 * among its Country's Regions (empty when none).
 */
export type CitiesData = string;

/** The Atlas Places a City line refers to: an Island's Country, and a Country's Regions. */
type Lookup = {
  countryOf(placeId: string): string | undefined;
  regionsOf(countryId: string): readonly { id: string }[];
};

export function decodeCities(data: CitiesData, { countryOf, regionsOf }: Lookup): CityRecord[] {
  const cities: CityRecord[] = [];
  for (const line of data.split(/\r?\n/)) {
    if (line === '') continue;
    const [id, local, french, aliases, lon, lat, place, region] = line.split('\t');
    const countryId = countryOf(place);
    const city: CityRecord = {
      id,
      name: french || local,
      aliases: [...(french ? [local] : []), ...(aliases ? aliases.split('|') : [])],
      lon: Number(lon),
      lat: Number(lat),
      countryId: countryId ?? place,
    };
    if (countryId) city.islandId = place;
    if (region) city.regionId = regionsOf(place)[Number(region)].id;
    cities.push(city);
  }
  return cities;
}

/** A name as search compares it: lower case, without accents, hyphens or apostrophes. */
export function fold(name: string): string {
  // Most names are plain ASCII: no accents to take off.
  const bare = /^[\x20-\x7e]*$/.test(name) ? name : name.normalize('NFD').replace(/\p{M}/gu, '');
  return bare
    .toLowerCase()
    .replace(/[-'’‘.,()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
