// The Atlas: the reference Places, read-only. The Countries and Islands are decoded once; the
// outlines of a Country's Regions are loaded and decoded the first time they are asked for,
// off the UI thread, and kept.
import { decodeCountries, type CountriesData, type CountryGeometry, type CountryRecord } from './countries.ts';
import { decodeRegions, type RegionGeometry, type RegionIndex, type RegionRecord, type RegionsData } from './regions.ts';

/** A point of the globe, in degrees. */
type Point = { lon: number; lat: number };

type Options = {
  countries: CountriesData;
  regionIndex: RegionIndex;
  /** The file of a Country's Regions (see REGION_FILES); only asked for Countries with Regions. */
  loadRegions: (countryId: string) => Promise<RegionsData>;
};

/** The Places at a point: its Country, and the Island or the Region it is in, if any. */
export type Located = { country: CountryRecord; island?: CountryRecord; region?: RegionRecord };

export function openAtlas({ countries: data, regionIndex, loadRegions }: Options) {
  const { countries, geometry } = decodeCountries(data);
  const byId = new Map(countries.map((c) => [c.id, c]));
  const regions = new Map<string, RegionRecord>();
  for (const [countryId, list] of Object.entries(regionIndex)) {
    for (const region of list) regions.set(region.id, { ...region, countryId });
  }
  const loaded = new Map<string, Promise<RegionGeometry | null>>();

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
