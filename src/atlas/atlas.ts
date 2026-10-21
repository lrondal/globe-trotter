// The Atlas: the reference Places, read-only. The Countries and Islands are decoded once; the
// outlines of a Country's Regions, and the list of Cities, are loaded and decoded the first
// time they are asked for, off the UI thread, and kept.
import { decodeCities, fold, type CitiesData, type CityRecord } from './cities.ts';
import { decodeCountries, type CountriesData, type CountryGeometry, type CountryRecord } from './countries.ts';
import { decodeRegions, type RegionGeometry, type RegionIndex, type RegionRecord, type RegionsData } from './regions.ts';

/** A point of the globe, in degrees. */
type Point = { lon: number; lat: number };

type Options = {
  countries: CountriesData;
  regionIndex: RegionIndex;
  /** The file of a Country's Regions (see REGION_FILES); only asked for Countries with Regions. */
  loadRegions: (countryId: string) => Promise<RegionsData>;
  /** The file of the Cities (assets/data/cities.tsv); none without it. */
  loadCities?: () => Promise<CitiesData>;
};

/** The Places at a point: its Country, and the Island or the Region it is in, if any. */
export type Located = { country: CountryRecord; island?: CountryRecord; region?: RegionRecord };

/** A City, and the alias it was found by when not by its name. */
export type CityMatch = CityRecord & { alias?: string };

/** What a search finds, by kind of Place, best first. */
export type SearchResults = {
  countries: CountryRecord[];
  islands: CountryRecord[];
  regions: RegionRecord[];
  cities: CityMatch[];
};

/** Results kept per kind of Place. */
const SEARCH_LIMIT = { countries: 5, islands: 5, regions: 5, cities: 20 };

/** Letters of the start of a word the Cities are indexed by. */
const START = 2;

/** How a folded name matches a folded query: 0 when it starts with it, 1 when a word of it does. */
function rankOf(name: string, query: string): 0 | 1 | null {
  if (name.startsWith(query)) return 0;
  return name.includes(` ${query}`) ? 1 : null;
}

export function openAtlas({ countries: data, regionIndex, loadRegions, loadCities = async () => '' }: Options) {
  const { countries, geometry } = decodeCountries(data);
  const byId = new Map(countries.map((c) => [c.id, c]));
  const regions = new Map<string, RegionRecord>();
  for (const [countryId, list] of Object.entries(regionIndex)) {
    for (const region of list) regions.set(region.id, { ...region, countryId });
  }
  const loaded = new Map<string, Promise<RegionGeometry | null>>();

  /** Places in alphabetical order, with their folded names. */
  const named = <T extends { name: string }>(list: T[]) =>
    list.sort((a, b) => a.name.localeCompare(b.name, 'fr')).map((place) => ({ place, key: fold(place.name) }));
  const searchable = {
    countries: named(countries.filter((c) => !c.countryId)),
    islands: named(countries.filter((c) => c.countryId)),
    regions: named([...regions.values()]),
  };
  /**
   * The Cities, most populated first, with their folded name and aliases, once loaded; and
   * by the first two letters of each word of those, the Cities a search can find, in order:
   * a search reads only those, not the whole list.
   */
  let cities: Promise<{ list: { city: CityRecord; keys: string[] }[]; byStart: Map<string, number[]> }> | null = null;
  const cityById = new Map<string, CityRecord>();
  const citiesLoaded = () => {
    cities ??= loadCities().then((text) => {
      const list = decodeCities(text, {
        countryOf: (id) => byId.get(id)?.countryId,
        regionsOf: (id) => regionIndex[id] ?? [],
      }).map((city) => ({ city, keys: [city.name, ...city.aliases].map(fold) }));
      for (const { city } of list) cityById.set(city.id, city);
      const byStart = new Map<string, number[]>();
      list.forEach(({ keys }, c) => {
        for (const key of keys) {
          for (let at = 0; at < key.length; at = key.indexOf(' ', at) + 1 || key.length) {
            const start = key.slice(at, at + START);
            const found = byStart.get(start);
            if (!found) byStart.set(start, [c]);
            else if (found[found.length - 1] !== c) found.push(c);
          }
        }
      });
      return { list, byStart };
    });
    return cities;
  };

  const atlas = {
    /** Every Country and Island, by the index the globe draws, hits and frames it with. */
    countries,
    geometry,
    /** The Regions of a Country, in the order of its RegionGeometry; none for an Island. */
    regionsOf(countryId: string): readonly Omit<RegionRecord, 'countryId'>[] {
      return regionIndex[countryId] ?? [];
    },
    region(id: string): RegionRecord | undefined {
      return regions.get(id);
    },
    /** The outlines of a Country's Regions, or null when it has none. */
    regionGeometry(countryId: string): Promise<RegionGeometry | null> {
      if (!loaded.has(countryId)) {
        const has = atlas.regionsOf(countryId).length > 0;
        loaded.set(countryId, has ? loadRegions(countryId).then(decodeRegions) : Promise.resolve(null));
      }
      return loaded.get(countryId)!;
    },
    /** The Places at a point; null at sea. On an Island, there is no Region. */
    async locate(point: Point): Promise<Located | null> {
      const c = containing(geometry, point);
      if (c < 0) return null;
      const found = countries[c];
      if (found.countryId) return { country: byId.get(found.countryId)!, island: found };
      const own = await atlas.regionGeometry(found.id);
      const r = own ? containing(own.geometry, point) : -1;
      return r < 0 ? { country: found } : { country: found, region: regions.get(own!.regions[r].id) };
    },
    /** A City of the list, once the Cities are loaded (see loadCities). */
    city(id: string): CityRecord | undefined {
      return cityById.get(id);
    },
    /** Loads the Cities ahead of a search, so that the first one is instant too. */
    async loadCities(): Promise<void> {
      await citiesLoaded();
    },
    /**
     * The Places whose name, or a word of it, starts with `query`, accents and case aside.
     * Cities rank by population, those found by their name before those found by an alias;
     * the others alphabetically. Those found by their start come first.
     */
    async search(query: string): Promise<SearchResults> {
      const q = fold(query);
      if (q === '') return { countries: [], islands: [], regions: [], cities: [] };
      const pick = <T>(list: { place: T; key: string }[], limit: number) => {
        const found: T[][] = [[], []];
        for (const { place, key } of list) {
          const rank = rankOf(key, q);
          if (rank !== null) found[rank].push(place);
        }
        return found.flat().slice(0, limit);
      };
      // By their start, by a word, by an alias.
      const found: CityMatch[][] = [[], [], []];
      const { list, byStart } = await citiesLoaded();
      // A one-letter search matches so many that the start of the list is enough.
      const read = q.length < START ? list.keys() : (byStart.get(q.slice(0, START)) ?? []);
      for (const c of read) {
        const { city, keys } = list[c];
        if (found[0].length === SEARCH_LIMIT.cities) break;
        const rank = rankOf(keys[0], q);
        if (rank !== null) {
          found[rank].push(city);
          continue;
        }
        if (found[2].length === SEARCH_LIMIT.cities) continue;
        const alias = keys.findIndex((key, k) => k > 0 && rankOf(key, q) !== null);
        if (alias > 0) found[2].push({ ...city, alias: city.aliases[alias - 1] });
      }
      return {
        countries: pick(searchable.countries, SEARCH_LIMIT.countries),
        islands: pick(searchable.islands, SEARCH_LIMIT.islands),
        regions: pick(searchable.regions, SEARCH_LIMIT.regions),
        cities: found.flat().slice(0, SEARCH_LIMIT.cities),
      };
    },
  };
  return atlas;
}

export type Atlas = ReturnType<typeof openAtlas>;

/**
 * Index of the outline of `geometry` holding the point, at full detail, or -1. A point is
 * inside an outline when its rings wind around it an odd number of times.
 */
function containing({ xyz, ringStart, ringCap, ringCountry }: CountryGeometry, { lon, lat }: Point): number {
  const λ = (lon * Math.PI) / 180;
  const φ = (lat * Math.PI) / 180;
  const [px, py, pz] = [Math.cos(φ) * Math.cos(λ), Math.cos(φ) * Math.sin(λ), Math.sin(φ)];
  const inside = new Set<number>();
  for (let r = 0; r < ringStart.length - 1; r++) {
    const dot = ringCap[4 * r] * px + ringCap[4 * r + 1] * py + ringCap[4 * r + 2] * pz;
    if (Math.acos(Math.max(-1, Math.min(1, dot))) > ringCap[4 * r + 3]) continue;
    // Winding angle of the ring around P, edge by edge on the sphere (as in hitTest.ts).
    let winding = 0;
    const [start, end] = [ringStart[r], ringStart[r + 1]];
    for (let k = start; k < end; k++) {
      const q = 3 * k;
      const s = 3 * (k + 1 === end ? start : k + 1);
      const [qx, qy, qz, sx, sy, sz] = [xyz[q], xyz[q + 1], xyz[q + 2], xyz[s], xyz[s + 1], xyz[s + 2]];
      const triple = px * (qy * sz - qz * sy) + py * (qz * sx - qx * sz) + pz * (qx * sy - qy * sx);
      const qw = qx * px + qy * py + qz * pz;
      const sw = sx * px + sy * py + sz * pz;
      winding += Math.atan2(triple, qx * sx + qy * sy + qz * sz - qw * sw);
    }
    if (Math.abs(winding) > Math.PI) {
      const owner = ringCountry[r];
      if (inside.has(owner)) inside.delete(owner);
      else inside.add(owner);
    }
  }
  return inside.size > 0 ? inside.values().next().value! : -1;
}
