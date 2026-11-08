// The Photo thumbnails of the globe: which Places show theirs, as what, and which give way
// when two collide. Run on the UI thread on every frame the globe moves, so that the
// thumbnails follow the selection at once and make room for each other as the zoom changes.
//
// Without a selection, only Countries and Islands show theirs, from PHOTO_ZOOM on. With a
// Country or an Island selected, its Regions and Cities show theirs whatever the zoom, and
// the others hide; it keeps its own only with Photos of its own, and shows one of those. A
// Region selected does the same with its Cities; so does a City selected, which selects its Region.
import type { SkImage } from '@shopify/react-native-skia';

/** What a thumbnail stands for: a Country or an Island, a Region, a City. */
export const TIER = { country: 0, region: 1, city: 2 } as const;

/** A Place with Photos, as the globe places its thumbnail. */
export type Thumbnail = {
  tier: (typeof TIER)[keyof typeof TIER];
  /** Index in the Atlas of the Country or Island it is, or is in. */
  country: number;
  /** Index of the Region it is, or is in, among its Country's; -1 for none. */
  region: number;
  /** Its Photos and those of the Places inside it. */
  count: number;
  /** Its own Photos only. */
  ownCount: number;
};

/**
 * A Place's Photo thumbnail as the globe draws it: where it sits, the image of its Cover
 * photo, and of its Cover photo among its own Photos when it has some.
 */
export type GlobeThumbnail = Thumbnail & {
  /** Its Place's key, which keeps its fade from one list to the next, and finds it when tapped. */
  key: string;
  lon: number;
  lat: number;
  /** The City it is, if any. */
  city: string | null;
  image: SkImage;
  ownImage: SkImage | null;
};

/** What is selected on the globe, by index: -1 for none. */
export type Selection = { country: number; region: number };

/** A thumbnail not shown. */
export const HIDDEN = 0;
/** A thumbnail showing the Place's Cover photo, which may be a Photo of a Place inside it. */
export const PLACE = 1;
/** A thumbnail showing only the Place's own Photos: its Cover photo among those. */
export const OWN = 2;
export type Shown = typeof HIDDEN | typeof PLACE | typeof OWN;

/** Without a selection, Countries and Islands show their thumbnails from this zoom on. To tune on the iPhone. */
export const PHOTO_ZOOM = 1.9;

export function shownAs(t: Thumbnail, selection: Selection, zoom: number): Shown {
  'worklet';
  if (selection.country < 0) return t.tier === TIER.country && zoom >= PHOTO_ZOOM ? PLACE : HIDDEN;
  if (t.country !== selection.country) return HIDDEN;
  // The Place selected, and the Places inside it.
  const selectedTier = selection.region < 0 ? TIER.country : TIER.region;
  if (selection.region >= 0 && t.region !== selection.region) return HIDDEN;
  if (t.tier === selectedTier) return t.ownCount > 0 ? OWN : HIDDEN;
  return t.tier > selectedTier ? PLACE : HIDDEN;
}

/** The diameter of a thumbnail at `zoom`, in points. */
export function thumbnailDiameter(zoom: number): number {
  'worklet';
  return Math.min(38, 16 + 5 * zoom);
}

/**
 * Which thumbnails stay where shown ones collide, closer than `diameter` points centre to
 * centre: those with the most Photos, by `counts`, and the first of equals.
 */
export function keepApart(xs: number[], ys: number[], counts: number[], shown: boolean[], diameter: number): boolean[] {
  'worklet';
  const order: number[] = [];
  for (let i = 0; i < xs.length; i++) if (shown[i]) order.push(i);
  order.sort((a, b) => counts[b] - counts[a] || a - b);
  const kept = xs.map(() => false);
  const reach = diameter * diameter;
  for (let k = 0; k < order.length; k++) {
    const i = order[k];
    let free = true;
    for (let m = 0; m < k && free; m++) {
      const j = order[m];
      if (!kept[j]) continue;
      const dx = xs[i] - xs[j];
      const dy = ys[i] - ys[j];
      if (dx * dx + dy * dy < reach) free = false;
    }
    kept[i] = free;
  }
  return kept;
}
