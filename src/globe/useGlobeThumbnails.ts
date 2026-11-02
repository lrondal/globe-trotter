// The Photo thumbnails the globe draws, from the Journal: every Place with Photos, where its
// thumbnail sits, and the images of its Cover photos, decoded once on the JS thread and
// handed to the globe on the UI thread. A thumbnail joins the list once its image is decoded,
// and fades in there.
import { Skia, type SkImage } from '@shopify/react-native-skia';
import { useEffect, useRef, useState } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

import { anchorOf, atlas, countryGeometry, placeIndex as indexOf } from '@/atlas';
import type { Journal, PlaceRef, Point } from '@/journal/journal';
import { photoUri } from '@/journal/devicePhotoFiles';

import { TIER, type GlobeThumbnail, type Thumbnail } from './thumbnails';

/** The selected Country's Regions, once loaded: their ids and where their thumbnails sit, in order. */
export type RegionAnchors = { country: number; anchors: (Point & { id: string })[] };

/** Where a Place's thumbnail sits and what it is in; null when that is not known yet. */
function placing(journal: Journal, place: PlaceRef, regions: RegionAnchors | null): (Point & Omit<Thumbnail, 'count' | 'ownCount'> & { city: string | null }) | null {
  if (place.level === 'country' || place.level === 'island') {
    const country = indexOf(place.id);
    return country < 0 ? null : { ...anchorOf(countryGeometry, country), tier: TIER.country, country, region: -1, city: null };
  }
  if (place.level === 'region') {
    const record = atlas.region(place.id);
    const country = record ? indexOf(record.countryId) : -1;
    // A Region's thumbnail only shows in its Country selected, whose Regions are then loaded.
    const region = regions?.country === country ? regions.anchors.findIndex((r) => r.id === place.id) : -1;
    if (region < 0) return null;
    const { lon, lat } = regions!.anchors[region];
    return { lon, lat, tier: TIER.region, country, region, city: null };
  }
  const city = journal.city(place.id);
  if (!city) return null;
  const country = indexOf(city.islandId ?? city.countryId);
  const region = city.regionId ? atlas.regionsOf(city.countryId).findIndex((r) => r.id === city.regionId) : -1;
  return country < 0 ? null : { lon: city.lon, lat: city.lat, tier: TIER.city, country, region, city: city.id };
}

export function useGlobeThumbnails(journal: Journal, version: number, regions: RegionAnchors | null): SharedValue<GlobeThumbnail[]> {
  const thumbnails = useSharedValue<GlobeThumbnail[]>([]);
  /** Decoded images by file name; null while decoding, or when it failed. */
  const images = useRef(new Map<string, SkImage | null>());
  const [decoded, setDecoded] = useState(0);

  useEffect(() => {
    const imageOf = (name: string): SkImage | null => {
      if (images.current.has(name)) return images.current.get(name)!;
      images.current.set(name, null);
      Skia.Data.fromURI(photoUri(name))
        .then((data) => {
          images.current.set(name, Skia.Image.MakeImageFromEncoded(data));
          setDecoded((n) => n + 1);
        })
        .catch(() => {});
      return null;
    };
    const list: GlobeThumbnail[] = [];
    for (const place of journal.photographed()) {
      const at = placing(journal, place, regions);
      const cover = journal.coverPhoto(place);
      const ownCover = journal.coverPhoto(place, true);
      const image = cover && imageOf(cover.thumbnail);
      if (!at || !image) continue;
      const ownCount = journal.photos(place).length;
      list.push({
        ...at,
        key: `${place.level}:${place.id}`,
        count: ownCount + journal.photosInside(place).length,
        ownCount,
        image,
        ownImage: ownCover && imageOf(ownCover.thumbnail),
      });
    }
    thumbnails.value = list;
  }, [thumbnails, journal, version, regions, decoded]);

  return thumbnails;
}
