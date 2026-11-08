// The globe: Countries drawn with Skia, turned and zoomed by the finger.
//
// Everything that runs per frame stays on the UI thread: the gestures, the inertia and the
// flight to a selected Country update shared values through the Globe camera, and the paths
// are re-projected from the geometry the Atlas prepared once. React only renders on layout
// and on button presses: selecting a Country is told to the parent, and the globe is memoised
// so the sheet re-rendering never rebuilds its gestures and paths mid-flight.
//
// The selected Country's Regions are handed over by the parent once loaded, and fade in over
// it while it fades to its tint: the flight never waits for them. A tap on one of them flies
// to it, and its outline darkens while the one left fades back; tapped again, or « ‹ Country »
// in the sheet, the globe flies back to the Country, its Regions staying. The Journal's Cities are
// ink dots, drawn over everything but the rim, and the Places' Photos are round thumbnails
// over them (see thumbnails.ts), drawn as one picture and faded in and out on the UI thread.
// A tap on a thumbnail or a City's dot is a tap on its Place. A long press tells the parent
// the point of the globe under the finger, where a Custom City goes.
import {
  BlurStyle,
  Canvas,
  Circle,
  ClipOp,
  createPicture,
  Group,
  notifyChange,
  Path,
  Picture,
  Skia,
  useFont,
  usePathValue,
} from '@shopify/react-native-skia';
import { LocateFixed, Minus, Plus } from 'lucide-react-native';
import { memo, useEffect, useImperativeHandle, useMemo, useState, type Ref } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  interpolateColor,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { countryGeometry, footprintOf, type CountryGeometry, type Footprint } from '@/atlas';
import { IconButton } from '@/components/IconButton';
import { detentHeight, sheetTiming } from '@/sheet/detents';
import { colors, duration, easing, fonts, layout, radius, text } from '@/theme/tokens';

import {
  centerOn,
  coast,
  drag,
  fit,
  fly,
  holdZoom,
  newFingerTrack,
  pinch,
  release,
  startTrack,
  trackFinger,
  zoomIn,
  zoomOut,
  type Point,
  type Shot,
  type Spin,
  type View as GlobeView,
} from './camera';
import { countryAt, TAP_TOLERANCE } from './hitTest';
import { LAYER, type Layer } from './layers';
import { MeasurePanel, type Measures } from './MeasurePanel';
import {
  DETAIL,
  discRadius,
  frameFor,
  globeCenterY,
  globeRadius,
  pointAt,
  projectPoint,
  traceCountries,
  traceGraticule,
  type Detail,
  type Viewport,
} from './projection';
import { HIDDEN, keepApart, OWN, shownAs, thumbnailDiameter, TIER, type GlobeThumbnail } from './thumbnails';

const zoomTiming = { duration: duration.slow, easing: Easing.bezier(...easing.out) };
/** How the Regions and the tint of their Country fade in and out. */
const fadeTiming = { duration: duration.base, easing: Easing.bezier(...easing.out) };
/** Regions can be tapped once they have faded in this far. */
const REGIONS_TAPPABLE = 0.5;
/** The Regions' hairlines, in points. */
const REGION_STROKE = 0.6;
/** The outline of the selected Region, in points: the design system's selected outline. */
const SELECTED_STROKE = 1.5;
/** The location dot: a 6 pt sage dot with a thin paper ring, in points. */
const LOCATION_RADIUS = 3;
const LOCATION_RING = 1.5;
/** A City: a 7 pt ink dot with a 1.2 pt paper ring, in points. */
const CITY_RADIUS = 3.5;
const CITY_RING = 1.2;
/** A thumbnail floats this far above its Place's point, in points, so a City's dot shows under it. */
const THUMBNAIL_LIFT = 4;
/** Its paper ring, in points. */
const THUMBNAIL_RING = 1.5;
/** A thumbnail is tapped this far from its centre, in points: a 44 pt zone. */
const THUMBNAIL_REACH = layout.hitMin / 2;
/** Its counter: a pill this high, in points, over its top right, its count in the overline's type. */
const COUNTER_HEIGHT = 16;
const COUNTER_FONT = require('@expo-google-fonts/hanken-grotesk/600SemiBold/HankenGrotesk_600SemiBold.ttf');
/** A City's dot is tapped this far from it, in points. */
const CITY_REACH = CITY_RADIUS + TAP_TOLERANCE;
/** Measures are reported to the panel this often, in milliseconds. */
const MEASURE_EVERY = 500;
/** One path per colour layer, in LAYER order. */
const LAYERS = Object.values(LAYER);
/**
 * After the colour layers, the Regions take two paths of their own: the selected Region,
 * and the one selected before it while its outline fades back.
 */
const SELECTED_PATH = LAYERS.length;
const LEFT_PATH = LAYERS.length + 1;
const REGION_PATHS = LAYERS.length + 2;
/** After a pinch, the finger left down drags the globe once it has moved this far, in points. */
const DRAG_AFTER_PINCH = 10;
/** A press this long, in milliseconds, without moving, is a long press: not a tap. */
const LONG_PRESS_MS = 450;
/** The fps toggle, in development, sits below the search pill: points below the status bar. */
const MEASURE_TOP = 56;

/** The Regions of the Country at index `country` in the Atlas, as the Atlas decoded them. */
export type ShownRegions = { country: number; geometry: CountryGeometry };
/** The colour layer of each Region of the Country at index `country`, in their order. */
export type RegionLayers = { country: number; layers: Layer[] };
/** A Journal City's dot. */
export type CityDot = Point & { id: string };

/** The fill of a Region's own path: its layer's colour, if its layer is filled. */
function fillOf(layer: Layer | undefined) {
  'worklet';
  if (layer === LAYER.visited) return colors.stateVisited;
  if (layer === LAYER.wish) return colors.stateWish;
  return 'transparent';
}

export type GlobeHandle = {
  /**
   * Flies to the Country at this index in the Atlas and opens its sheet, as a tap on it does;
   * framing `footprint` rather than the Country when given, a City of it say.
   */
  select(country: number, footprint?: Footprint): void;
  /**
   * Flies to a City of the Country at this index, framing `footprint`, and opens its sheet. Its
   * Region, `region` by its index in the Country's RegionGeometry or -1 for none, is selected
   * with it: the Region's Photo thumbnails show as for the Region selected.
   */
  selectCity(country: number, footprint: Footprint, region: number): void;
  /**
   * Flies to Region `region` of that Country, by its index in the Country's RegionGeometry, as
   * a tap on it does, and tells onSelect the Country. The flight starts at once: towards the
   * Country while its Regions load, then towards the Region once they are there.
   */
  selectRegion(country: number, region: number): void;
  /**
   * From the selected Region, flies back to its Country, framed as when it was selected, and
   * tells onSelect the Country; the Regions stay, and the sheet at its height.
   */
  backToCountry(): void;
  /** Lets go of the selected Country: closes the sheet and lowers the globe back. */
  deselect(): void;
};

type Props = {
  /** The view the globe opens on. Read once: later changes never move the globe. */
  start: GlobeView;
  /** The user's position, drawn as the location dot; null hides it. */
  position: Point | null;
  /** The recentre button: resolves with the point to fly to, or null to stay put. */
  onRecenter: () => Promise<Point | null>;
  /** Height of the Place sheet showing (see PlaceSheet), opened and closed by the globe. */
  sheetHeight: SharedValue<number>;
  /** Index in the Atlas of the Country tapped, or null when the sea is tapped or the globe recentres. */
  onSelect: (country: number | null) => void;
  /** The colour layer (see layers.ts) of each Country, by its index in the Atlas. */
  layers: SharedValue<Layer[]>;
  /** The selected Country's Regions, once loaded; drawn only while their Country is selected. */
  regions: SharedValue<ShownRegions | null>;
  /** The colour layers of those Regions. */
  regionLayers: SharedValue<RegionLayers | null>;
  /** Index of the Region tapped, in the geometry of `regions`, as the globe flies to it. */
  onSelectRegion: (region: number) => void;
  /** The Journal's Cities. */
  cities: SharedValue<CityDot[]>;
  /** The City whose dot or thumbnail is tapped, as the globe would select it. */
  onSelectCity: (id: string) => void;
  /** The Places with Photos, in no set order. */
  thumbnails: SharedValue<GlobeThumbnail[]>;
  /** The point of the globe under a long press; none off the globe. */
  onLongPress: (point: Point) => void;
  ref?: Ref<GlobeHandle>;
};

export const Globe = memo(function Globe({
  start,
  position,
  onRecenter,
  sheetHeight,
  onSelect,
  layers,
  regions,
  regionLayers,
  onSelectRegion,
  cities,
  onSelectCity,
  thumbnails,
  onLongPress,
  ref,
}: Props) {
  const insets = useSafeAreaInsets();
  const viewport = useSharedValue<Viewport>({ width: 0, height: 0 });
  const lon = useSharedValue(start.lon);
  const lat = useSharedValue(start.lat);
  const zoom = useSharedValue(start.zoom);
  const lift = useSharedValue(0);
  const spin = useSharedValue<Spin | null>(null);
  const flight = useSharedValue<{ from: Shot; to: Shot; elapsed: number } | null>(null);
  const pinchedThisTouch = useSharedValue(false);
  /** Points the finger left down after a pinch still has to move before it drags the globe. */
  const dragSlack = useSharedValue(0);
  /** Where the finger dragged the globe lately, for how fast it is lifted. Filled in place. */
  const fingerTrack = useSharedValue(useMemo(newFingerTrack, []));
  /** Fingers down at the last drag update. */
  const dragPointers = useSharedValue(0);
  const pinchStartZoom = useSharedValue(start.zoom);
  /** The point between the pinching fingers at the last update, from the globe's centre then. */
  const pinchFocal = useSharedValue({ x: 0, y: 0 });
  /** 1 while + is held down, -1 while − is, 0 otherwise. */
  const holding = useSharedValue<0 | 1 | -1>(0);
  const shownPosition = useSharedValue(position);
  /** Index in the Atlas of the selected Country, or -1. */
  const selectedCountry = useSharedValue(-1);
  /** 0 to 1 as the selected Country's Regions fade in, and it fades to its tint. */
  const fade = useSharedValue(0);
  /** Index of the selected Region in the selected Country's, or -1; and how marked its outline is. */
  const selectedRegion = useSharedValue(-1);
  const emphasis = useSharedValue(0);
  /** The Region selected before it, or -1, while its outline fades back. */
  const leftRegion = useSharedValue(-1);
  const leftEmphasis = useSharedValue(0);
  /** The selected Region the globe flies to once its Country's Regions are there, or -1. */
  const awaitedRegion = useSharedValue(-1);
  /** Whether the sheet shows a City, in the selected Region if it has one, rather than a Region or a Country. */
  const cityShown = useSharedValue(false);

  // Light detail is plenty for the globe and keeps it smooth while it turns and zooms fast.
  const [detail, setDetail] = useState<Detail>('light');
  const [measures, setMeasures] = useState<Measures | null>(null);
  const measuring = measures !== null;
  const detailArea = DETAIL[detail];
  const buildMs = useSharedValue(0);
  const points = useSharedValue(0);
  const meter = useSharedValue({ start: 0, frames: 0, time: 0, worst: 0, ms: 0, lon: 0, lat: 0, zoom: 0 });

  const view = (): GlobeView => {
    'worklet';
    return { lon: lon.value, lat: lat.value, zoom: zoom.value };
  };
  // Turning never writes the zoom, so it cannot cancel a running zoom animation.
  const turnTo = (next: GlobeView) => {
    'worklet';
    lon.value = next.lon;
    lat.value = next.lat;
  };
  const frame = () => {
    'worklet';
    return frameFor(view(), viewport.value, lift.value);
  };

  // Flies to frame a Place above the sheet, opened to half height unless it stays where it is.
  const flyOver = (footprint: Footprint, sheetStays = false) => {
    'worklet';
    const screenHeight = viewport.value.height;
    const half = detentHeight('half', screenHeight);
    const to = fit(footprint, viewport.value, screenHeight - half);
    spin.value = null;
    holding.value = 0;
    cancelAnimation(zoom);
    cancelAnimation(lift);
    flight.value = { from: { view: view(), lift: lift.value }, to, elapsed: 0 };
    if (!sheetStays) sheetHeight.value = withTiming(half, sheetTiming);
  };
  // The outline of the Region selected darkens, while the one before it fades back.
  const emphasize = (region: number) => {
    'worklet';
    if (region === selectedRegion.value) return;
    leftRegion.value = selectedRegion.value;
    leftEmphasis.value = emphasis.value;
    leftEmphasis.value = withTiming(0, fadeTiming);
    selectedRegion.value = region;
    emphasis.value = 0;
    if (region >= 0) emphasis.value = withTiming(1, fadeTiming);
  };
  const select = (country: number, footprint?: Footprint, region = -1) => {
    'worklet';
    awaitedRegion.value = -1;
    cityShown.value = false;
    // Another Country's Regions go at once; the same Country's stay.
    if (country !== selectedCountry.value) {
      cancelAnimation(fade);
      fade.value = 0;
      selectedRegion.value = -1;
      leftRegion.value = -1;
    }
    emphasize(region);
    selectedCountry.value = country;
    flyOver(footprint ?? footprintOf(countryGeometry, country));
    scheduleOnRN(onSelect, country);
  };
  // Its Regions fade out with it.
  const letGo = () => {
    'worklet';
    selectedCountry.value = -1;
    awaitedRegion.value = -1;
    cityShown.value = false;
    fade.value = withTiming(0, fadeTiming);
  };
  const deselect = () => {
    'worklet';
    letGo();
    flight.value = null;
    lift.value = withTiming(0, sheetTiming);
    sheetHeight.value = withTiming(0, sheetTiming);
  };
  // A flight cut short by a gesture still lifts the globe above the sheet it opened, and
  // stays cut short when the Region it was for shows.
  const stopFlight = () => {
    'worklet';
    awaitedRegion.value = -1;
    const flying = flight.value;
    if (!flying) return;
    flight.value = null;
    lift.value = withTiming(flying.to.lift, sheetTiming);
  };
  // A Region tapped in the selected Country, whose Regions stay: the globe flies to it.
  const flyToRegion = (shown: ShownRegions, region: number) => {
    'worklet';
    cityShown.value = false;
    emphasize(region);
    flyOver(footprintOf(shown.geometry, region));
    scheduleOnRN(onSelectRegion, region);
  };
  // Back from the selected Region to its Country, whose Regions stay: its outline fades back.
  const backToCountry = () => {
    'worklet';
    const country = selectedCountry.value;
    // Pressed again while the Region fades out of the sheet, it is already on its way.
    if (country < 0 || selectedRegion.value < 0) return;
    awaitedRegion.value = -1;
    cityShown.value = false;
    emphasize(-1);
    flyOver(footprintOf(countryGeometry, country), true);
    scheduleOnRN(onSelect, country);
  };
  // A Region asked for, whose Regions may not be loaded yet: framed by its Country meanwhile.
  const selectRegion = (country: number, region: number) => {
    'worklet';
    const shown = regions.value;
    const loaded = shown?.country === country;
    select(country, loaded ? footprintOf(shown.geometry, region) : undefined, region);
    if (!loaded) awaitedRegion.value = region;
  };
  // A City selects its Region with it, if it has one: the globe is in the Region.
  const selectCity = (country: number, footprint: Footprint, region: number) => {
    'worklet';
    select(country, footprint, region);
    cityShown.value = true;
  };
  // The selected Region tapped: from a City in it, back to the Region; from the Region, back
  // to its Country.
  const leaveSelectedRegion = () => {
    'worklet';
    if (!cityShown.value) {
      backToCountry();
      return;
    }
    const shown = regions.value;
    if (shown?.country === selectedCountry.value) flyToRegion(shown, selectedRegion.value);
    else selectRegion(selectedCountry.value, selectedRegion.value);
  };
  // Recentring lets go of the selected Country: the whole globe faces the point, sheet closed.
  const flyTo = (point: Point) => {
    'worklet';
    letGo();
    spin.value = null;
    holding.value = 0;
    cancelAnimation(zoom);
    cancelAnimation(lift);
    flight.value = { from: { view: view(), lift: lift.value }, to: { view: centerOn(view(), point), lift: 0 }, elapsed: 0 };
    sheetHeight.value = withTiming(0, sheetTiming);
    scheduleOnRN(onSelect, null);
  };
  // On the UI thread, so it cannot interleave with a frame of the flight.
  useImperativeHandle(
    ref,
    () => ({
      select: (country, footprint) => scheduleOnUI(select, country, footprint),
      selectCity: (country, footprint, region) => scheduleOnUI(selectCity, country, footprint, region),
      selectRegion: (country, region) => scheduleOnUI(selectRegion, country, region),
      backToCountry: () => scheduleOnUI(backToCountry),
      deselect: () => scheduleOnUI(deselect),
    }),
    [],
  );

  // The paths may read the camera through frame(): usePathValue notifies its own path,
  // so it re-runs every frame whatever its callback reads. Derived values do not.
  // The Countries are traced once per frame into one path per colour layer, built here like
  // usePathValue builds its one path, and the camera and layers are read directly.
  const builders = useSharedValue(useMemo(() => LAYERS.map(() => Skia.PathBuilder.Make()), []));
  const landPaths = useSharedValue(useMemo(() => LAYERS.map(() => Skia.Path.Make()), []));
  // The selected Country's Regions, likewise, in the same layers, and the paths of the
  // selected Region and of the one before it.
  const regionBuilders = useSharedValue(useMemo(() => Array.from({ length: REGION_PATHS }, () => Skia.PathBuilder.Make()), []));
  const regionPaths = useSharedValue(useMemo(() => Array.from({ length: REGION_PATHS }, () => Skia.Path.Make()), []));
  // The path each Region is traced into: its layer's, or one of its own while selected.
  const regionTraced = useDerivedValue(() => {
    const shownLayers = regionLayers.value;
    if (!shownLayers) return null;
    const traced: number[] = shownLayers.layers.slice();
    if (leftRegion.value >= 0 && leftRegion.value < traced.length) traced[leftRegion.value] = LEFT_PATH;
    if (selectedRegion.value >= 0 && selectedRegion.value < traced.length) traced[selectedRegion.value] = SELECTED_PATH;
    return { country: shownLayers.country, traced };
  });
  useDerivedValue(() => {
    if (viewport.value.width === 0) return;
    const sinks = builders.value;
    for (const sink of sinks) sink.reset();
    const start = performance.now();
    const camera = frameFor({ lon: lon.value, lat: lat.value, zoom: zoom.value }, viewport.value, lift.value);
    let drawn = traceCountries(countryGeometry, camera, detailArea, sinks, layers.value);
    landPaths.value = sinks.map((sink) => sink.build());
    const shown = regions.value;
    const shownLayers = regionTraced.value;
    // Their layers may arrive a frame before or after them: never draw one with the other's.
    if (fade.value > 0 && shown && shownLayers?.country === shown.country) {
      const regionSinks = regionBuilders.value;
      for (const sink of regionSinks) sink.reset();
      drawn += traceCountries(shown.geometry, camera, detailArea, regionSinks, shownLayers.traced);
      regionPaths.value = regionSinks.map((sink) => sink.build());
      notifyChange(regionPaths);
    }
    points.value = drawn;
    buildMs.value = performance.now() - start;
    notifyChange(landPaths);
  });
  // A Region asked for before its Country's Regions were there: the globe turns towards it.
  useAnimatedReaction(
    () => regions.value,
    (shown) => {
      const region = awaitedRegion.value;
      if (region < 0 || !shown || shown.country !== selectedCountry.value) return;
      awaitedRegion.value = -1;
      flyOver(footprintOf(shown.geometry, region));
    },
  );
  // The selected Country's Regions fade in once they are there; deselecting fades them out.
  useAnimatedReaction(
    () => selectedCountry.value >= 0 && regions.value?.country === selectedCountry.value,
    (ready, before) => {
      if (ready && !before) fade.value = withTiming(1, fadeTiming);
    },
  );
  const land = useDerivedValue(() => landPaths.value[LAYER.land]);
  const visited = useDerivedValue(() => landPaths.value[LAYER.visited]);
  const wish = useDerivedValue(() => landPaths.value[LAYER.wish]);
  const outlineOnly = useDerivedValue(() => landPaths.value[LAYER.outline]);
  const visitedTint = useDerivedValue(() => landPaths.value[LAYER.visitedTint]);
  const wishTint = useDerivedValue(() => landPaths.value[LAYER.wishTint]);
  const visitedTintColor = useDerivedValue(() =>
    interpolateColor(fade.value, [0, 1], [colors.stateVisited, colors.stateVisitedTint]),
  );
  const wishTintColor = useDerivedValue(() => interpolateColor(fade.value, [0, 1], [colors.stateWish, colors.stateWishTint]));
  // Regions take no tint layer: only these four.
  const regionLand = useDerivedValue(() => regionPaths.value[LAYER.land]);
  const regionVisited = useDerivedValue(() => regionPaths.value[LAYER.visited]);
  const regionWish = useDerivedValue(() => regionPaths.value[LAYER.wish]);
  const regionOutline = useDerivedValue(() => regionPaths.value[LAYER.outline]);
  const selectedRegionPath = useDerivedValue(() => regionPaths.value[SELECTED_PATH]);
  const leftRegionPath = useDerivedValue(() => regionPaths.value[LEFT_PATH]);
  // Filled as their layer would be, so only their outline changes.
  const selectedRegionFill = useDerivedValue(() => fillOf(regionLayers.value?.layers[selectedRegion.value]));
  const leftRegionFill = useDerivedValue(() => fillOf(regionLayers.value?.layers[leftRegion.value]));
  const graticule = usePathValue((path) => {
    'worklet';
    if (viewport.value.width === 0) return;
    traceGraticule(frame(), path);
  });
  const cx = useDerivedValue(() => viewport.value.width / 2);
  const cy = useDerivedValue(() => globeCenterY(viewport.value) - lift.value);
  const r = useDerivedValue(() =>
    discRadius(frameFor({ lon: lon.value, lat: lat.value, zoom: zoom.value }, viewport.value, lift.value)),
  );

  useEffect(() => {
    shownPosition.value = position;
  }, [shownPosition, position]);
  // The camera is read here, not through frame(): a derived value only re-runs when a
  // shared value it reads directly changes, so the dot would stay where the globe opened.
  const dot = useDerivedValue(() => {
    const point = shownPosition.value;
    if (!point || viewport.value.width === 0) return { x: 0, y: 0, visible: false };
    const camera = { lon: lon.value, lat: lat.value, zoom: zoom.value };
    return projectPoint(frameFor(camera, viewport.value, lift.value), point);
  });
  const dotX = useDerivedValue(() => dot.value.x);
  const dotY = useDerivedValue(() => dot.value.y);
  const dotOpacity = useDerivedValue(() => (dot.value.visible ? 1 : 0));
  // The Cities on the near side, as one path of rings and one of dots, re-traced every frame
  // like the Countries.
  const cityBuilders = useSharedValue(useMemo(() => [Skia.PathBuilder.Make(), Skia.PathBuilder.Make()], []));
  const cityPaths = useSharedValue(useMemo(() => [Skia.Path.Make(), Skia.Path.Make()], []));
  useDerivedValue(() => {
    if (viewport.value.width === 0) return;
    const [rings, dots] = cityBuilders.value;
    rings.reset();
    dots.reset();
    const camera = frameFor({ lon: lon.value, lat: lat.value, zoom: zoom.value }, viewport.value, lift.value);
    for (const point of cities.value) {
      const { x, y, visible } = projectPoint(camera, point);
      if (!visible) continue;
      rings.addCircle(x, y, CITY_RADIUS + CITY_RING);
      dots.addCircle(x, y, CITY_RADIUS);
    }
    cityPaths.value = [rings.build(), dots.build()];
    notifyChange(cityPaths);
  });
  const cityRings = useDerivedValue(() => cityPaths.value[0]);
  const cityDots = useDerivedValue(() => cityPaths.value[1]);

  // The thumbnails: each one's opacity, which the frame callback moves towards its target,
  // and, from the last frame drawn, where those shown are, for a tap.
  const thumbnailAlpha = useSharedValue<Record<string, number>>({});
  const thumbnailTarget = useSharedValue<Record<string, number>>({});
  const thumbnailSpots = useSharedValue<{ x: number; y: number; key: string }[]>([]);
  const paints = useMemo(() => {
    const shadow = Skia.Paint();
    shadow.setColor(Skia.Color('rgba(27,26,23,0.3)'));
    shadow.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 2, true));
    const ring = Skia.Paint();
    ring.setColor(Skia.Color(colors.paper0));
    const image = Skia.Paint();
    image.setAntiAlias(true);
    const counter = Skia.Paint();
    counter.setColor(Skia.Color(colors.ink1));
    const count = Skia.Paint();
    count.setColor(Skia.Color(colors.paper0));
    return { shadow, ring, image, counter, count };
  }, []);
  // Null until loaded: the counters wait for it.
  const counterFont = useFont(COUNTER_FONT, text.overline.fontSize);
  const thumbnailPicture = useDerivedValue(() => {
    const { width, height } = viewport.value;
    const list = thumbnails.value;
    const alpha = thumbnailAlpha.value;
    const camera = frameFor({ lon: lon.value, lat: lat.value, zoom: zoom.value }, viewport.value, lift.value);
    const selection = { country: selectedCountry.value, region: selectedRegion.value };
    const d = thumbnailDiameter(zoom.value);
    const xs: number[] = [];
    const ys: number[] = [];
    const counts: number[] = [];
    const shown: boolean[] = [];
    const showings: number[] = [];
    for (const t of list) {
      const { x, y, visible } = projectPoint(camera, t);
      const showing = shownAs(t, selection, zoom.value);
      xs.push(x);
      ys.push(y - d / 2 - THUMBNAIL_LIFT);
      showings.push(showing);
      counts.push(showing === OWN ? t.ownCount : t.count);
      shown.push(visible && showing !== HIDDEN && (showing !== OWN || t.ownImage !== null));
    }
    const kept = keepApart(xs, ys, counts, shown, d);
    const target: Record<string, number> = {};
    const spots: { x: number; y: number; key: string }[] = [];
    list.forEach((t, i) => {
      target[t.key] = kept[i] ? 1 : 0;
      if (kept[i] && (alpha[t.key] ?? 0) > 0.5) spots.push({ x: xs[i], y: ys[i], key: t.key });
    });
    thumbnailTarget.value = target;
    thumbnailSpots.value = spots;
    return createPicture(
      (canvas) => {
        const r = d / 2;
        list.forEach((t, i) => {
          const a = alpha[t.key] ?? 0;
          // Off the near side, a thumbnail goes at once rather than fading over the rim.
          if (a <= 0 || !shown[i]) return;
          const image = showings[i] === OWN && t.ownImage ? t.ownImage : t.image;
          const [x, y] = [xs[i], ys[i]];
          paints.shadow.setAlphaf(0.3 * a);
          canvas.drawCircle(x, y + 2, r, paints.shadow);
          paints.ring.setAlphaf(a);
          canvas.drawCircle(x, y, r, paints.ring);
          // The middle square of the image, cut round inside the ring.
          const [w, h] = [image.width(), image.height()];
          const side = Math.min(w, h);
          const inner = r - THUMBNAIL_RING;
          const disc = Skia.XYWHRect(x - inner, y - inner, 2 * inner, 2 * inner);
          canvas.save();
          canvas.clipRRect(Skia.RRectXY(disc, inner, inner), ClipOp.Intersect, true);
          paints.image.setAlphaf(a);
          canvas.drawImageRect(image, Skia.XYWHRect((w - side) / 2, (h - side) / 2, side, side), disc, paints.image);
          canvas.restore();
          if (counts[i] < 2 || !counterFont) return;
          // The counter: an ink pill ringed with paper, over the top right.
          const label = String(counts[i]);
          const textWidth = counterFont.measureText(label).width;
          const pill = Math.max(COUNTER_HEIGHT, textWidth + 8);
          const [px, py] = [x + r * 0.7 - pill / 2, y - r * 0.7 - COUNTER_HEIGHT / 2];
          const round = COUNTER_HEIGHT / 2;
          canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(px - 1, py - 1, pill + 2, COUNTER_HEIGHT + 2), round + 1, round + 1), paints.ring);
          paints.counter.setAlphaf(a);
          canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(px, py, pill, COUNTER_HEIGHT), round, round), paints.counter);
          paints.count.setAlphaf(a);
          // On the baseline that centres the digits' height in the pill.
          canvas.drawText(label, px + (pill - textWidth) / 2, py + round + counterFont.measureText(label).height / 2, paints.count, counterFont);
        });
      },
      { width, height },
    );
  });

  const tap = Gesture.Tap()
    .maxDistance(10)
    .onEnd((e, success) => {
      if (!success) return;
      const f = frame();
      // A thumbnail, or else a City's dot, before the land they are drawn over: the nearest.
      // By key: the list may have changed since the frame that placed them.
      let key: string | null = null;
      let nearest = THUMBNAIL_REACH;
      for (const spot of thumbnailSpots.value) {
        const distance = Math.hypot(spot.x - e.x, spot.y - e.y);
        if (distance < nearest) {
          nearest = distance;
          key = spot.key;
        }
      }
      const t = key === null ? null : (thumbnails.value.find((candidate) => candidate.key === key) ?? null);
      if (t?.city) {
        scheduleOnRN(onSelectCity, t.city);
        return;
      }
      if (t && t.tier === TIER.region) {
        const loaded = regions.value;
        if (t.country === selectedCountry.value && t.region === selectedRegion.value) leaveSelectedRegion();
        else if (loaded?.country === t.country) flyToRegion(loaded, t.region);
        else selectRegion(t.country, t.region);
        return;
      }
      if (t) {
        select(t.country);
        return;
      }
      let city: string | null = null;
      let nearestCity = CITY_REACH;
      for (const dot of cities.value) {
        const { x, y, visible } = projectPoint(f, dot);
        const distance = Math.hypot(x - e.x, y - e.y);
        if (visible && distance < nearestCity) {
          nearestCity = distance;
          city = dot.id;
        }
      }
      if (city !== null) {
        scheduleOnRN(onSelectCity, city);
        return;
      }
      const country = countryAt(countryGeometry, f, detailArea, e.x, e.y);
      // Inside the selected Country, once its Regions show, a tap picks one of them; the one
      // selected, tapped again, goes back to the Country, or to itself from a City in it.
      const shown = regions.value;
      if (country >= 0 && country === selectedCountry.value && shown?.country === country && fade.value > REGIONS_TAPPABLE) {
        const region = countryAt(shown.geometry, f, detailArea, e.x, e.y);
        if (region >= 0 && region === selectedRegion.value) {
          leaveSelectedRegion();
          return;
        }
        if (region >= 0) {
          flyToRegion(shown, region);
          return;
        }
      }
      if (country >= 0) {
        select(country);
      } else {
        deselect();
        scheduleOnRN(onSelect, null);
      }
    });
  const longPress = Gesture.LongPress()
    .minDuration(LONG_PRESS_MS)
    .maxDistance(10)
    .onStart((e) => {
      const point = pointAt(frame(), e.x, e.y);
      if (point) scheduleOnRN(onLongPress, point);
    });
  const pan = Gesture.Pan()
    .minDistance(4)
    .averageTouches(true)
    .onBegin(() => {
      // Touching the globe stops it, in flight too.
      spin.value = null;
      stopFlight();
      pinchedThisTouch.value = false;
      dragSlack.value = 0;
      startTrack(fingerTrack.value, performance.now());
    })
    .onStart((e) => {
      dragPointers.value = e.numberOfPointers;
    })
    .onChange((e) => {
      // When a finger lands or lifts, the point between the fingers jumps: not a drag.
      if (e.numberOfPointers !== dragPointers.value) {
        dragPointers.value = e.numberOfPointers;
        return;
      }
      // While pinching, the pinch moves the globe.
      if (pinchedThisTouch.value && e.numberOfPointers > 1) return;
      // The finger left down after a pinch drags once it really moves, not as it slips
      // while the other lifts: a visible slide at deep zoom.
      if (dragSlack.value > 0) {
        dragSlack.value -= Math.hypot(e.changeX, e.changeY);
        return;
      }
      turnTo(drag(view(), e.changeX, e.changeY, globeRadius(viewport.value)));
      // Only what turned the globe counts, so it coasts on as it turned under the finger.
      trackFinger(fingerTrack.value, performance.now(), e.changeX, e.changeY);
    })
    .onEnd((e) => {
      // Lifting the fingers after a pinch, without dragging since, leaves the globe still.
      if (pinchedThisTouch.value && dragSlack.value > 0) return;
      const measured = { x: e.velocityX, y: e.velocityY };
      spin.value = release(view(), fingerTrack.value, performance.now(), measured, globeRadius(viewport.value));
    });
  const pinchGesture = Gesture.Pinch()
    .onStart((e) => {
      pinchedThisTouch.value = true;
      dragSlack.value = DRAG_AFTER_PINCH;
      spin.value = null;
      stopFlight();
      cancelAnimation(zoom);
      holding.value = 0;
      pinchStartZoom.value = zoom.value;
      const f = frame();
      pinchFocal.value = { x: e.focalX - f.cx, y: e.focalY - f.cy };
    })
    .onUpdate((e) => {
      // As a finger lifts, the point between the fingers jumps to the other one: ignore it.
      if (e.numberOfPointers < 2) return;
      // The ground under the fingers stays under them, so a pinch zooms into what it is on.
      // Measured from the globe's centre, which may still be rising above the sheet.
      const f = frame();
      const focal = { x: e.focalX - f.cx, y: e.focalY - f.cy };
      const next = pinch(view(), pinchStartZoom.value, e.scale, pinchFocal.value, focal, globeRadius(viewport.value));
      pinchFocal.value = focal;
      turnTo(next);
      zoom.value = next.zoom;
    });
  // A tap or a long press fails as soon as the finger moves enough to turn the globe; a long
  // press, once the finger has stayed down long enough, cancels the tap.
  const gestures = Gesture.Race(Gesture.Simultaneous(pan, pinchGesture), longPress, tap);

  useFrameCallback((frame) => {
    'worklet';
    const dt = frame.timeSincePreviousFrame ?? 0;
    if (holding.value !== 0) zoom.value = holdZoom(view(), holding.value, dt).zoom;
    const spinning = spin.value;
    if (spinning) {
      const next = coast(view(), spinning, dt);
      turnTo(next.view);
      spin.value = next.spin;
    }
    const flying = flight.value;
    if (flying) {
      const elapsed = flying.elapsed + dt;
      const { shot, done } = fly(flying.from, flying.to, elapsed);
      turnTo(shot.view);
      zoom.value = shot.view.zoom;
      lift.value = shot.lift;
      flight.value = done ? null : { ...flying, elapsed };
    }
    // Thumbnails fade towards being shown or not; nothing is written once they are there.
    const target = thumbnailTarget.value;
    const alpha = thumbnailAlpha.value;
    let fading = false;
    const faded: Record<string, number> = {};
    for (const key in target) {
      const from = alpha[key] ?? 0;
      const to = target[key];
      const step = dt / duration.base;
      faded[key] = to > from ? Math.min(to, from + step) : Math.max(to, from - step);
      if (faded[key] !== from) fading = true;
    }
    if (fading) thumbnailAlpha.value = faded;
    if (!measuring) return;
    // fps and build time while the globe moves, as in the prototype's panel.
    const w = meter.value;
    const moved = w.lon !== lon.value || w.lat !== lat.value || w.zoom !== zoom.value;
    const next = { ...w, lon: lon.value, lat: lat.value, zoom: zoom.value };
    if (moved && dt > 0) {
      next.frames++;
      next.time += dt;
      next.worst = Math.max(next.worst, dt);
      next.ms += buildMs.value;
    }
    if (frame.timestamp - w.start > MEASURE_EVERY) {
      if (next.frames > 0) {
        scheduleOnRN(setMeasures, {
          fps: (next.frames * 1000) / next.time,
          msPerFrame: next.ms / next.frames,
          worstFrameMs: next.worst,
          points: points.value,
          zoom: zoom.value,
        });
      }
      Object.assign(next, { start: frame.timestamp, frames: 0, time: 0, worst: 0, ms: 0 });
    }
    meter.value = next;
  });

  const zoomBy = (step: (v: GlobeView) => GlobeView) => {
    'worklet';
    stopFlight();
    zoom.value = withTiming(step(view()).zoom, zoomTiming);
  };
  // On the UI thread, like the flight it may interrupt.
  const zoomWith = (step: (v: GlobeView) => GlobeView) => scheduleOnUI(zoomBy, step);
  // Holding + or − zooms on and on until let go, so the whole range takes seconds, not presses.
  const hold = (direction: 0 | 1 | -1) => {
    'worklet';
    if (direction !== 0) {
      stopFlight();
      cancelAnimation(zoom);
    }
    holding.value = direction;
  };
  const holdWith = (direction: 0 | 1 | -1) => scheduleOnUI(hold, direction);
  const recenter = async () => {
    const point = await onRecenter();
    if (point) scheduleOnUI(flyTo, point);
  };
  // The map buttons rise with the sheet, up to its half height; above that it covers them.
  const mapButtonsStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.min(sheetHeight.value, detentHeight('half', viewport.value.height)) }],
  }));

  return (
    <View
      style={styles.screen}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        viewport.value = { width, height };
      }}>
      <GestureDetector gesture={gestures}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Circle cx={cx} cy={cy} r={r} color={colors.globeOcean} />
          <Path path={graticule} style="stroke" strokeWidth={0.5} color={colors.globeGraticule} />
          <Path path={land} color={colors.globeLand} />
          <Path path={visited} color={colors.stateVisited} />
          <Path path={wish} color={colors.stateWish} />
          <Path path={visitedTint} color={visitedTintColor} />
          <Path path={wishTint} color={wishTintColor} />
          {[land, visited, wish, outlineOnly, visitedTint, wishTint].map((path, i) => (
            <Path key={i} path={path} style="stroke" strokeWidth={0.5} color={colors.globeStroke} />
          ))}
          <Group opacity={fade}>
            <Path path={regionVisited} color={colors.stateVisited} />
            <Path path={regionWish} color={colors.stateWish} />
            <Path path={selectedRegionPath} color={selectedRegionFill} />
            <Path path={leftRegionPath} color={leftRegionFill} />
            {[regionLand, regionVisited, regionWish, regionOutline, selectedRegionPath, leftRegionPath].map((path, i) => (
              <Path key={i} path={path} style="stroke" strokeWidth={REGION_STROKE} color={colors.paper0} />
            ))}
            <Path path={leftRegionPath} style="stroke" strokeWidth={SELECTED_STROKE} color={colors.ink1} opacity={leftEmphasis} />
            <Path path={selectedRegionPath} style="stroke" strokeWidth={SELECTED_STROKE} color={colors.ink1} opacity={emphasis} />
          </Group>
          <Group opacity={dotOpacity}>
            <Circle cx={dotX} cy={dotY} r={LOCATION_RADIUS + LOCATION_RING} color={colors.paper0} />
            <Circle cx={dotX} cy={dotY} r={LOCATION_RADIUS} color={colors.globeLocation} />
          </Group>
          <Path path={cityRings} color={colors.paper0} />
          <Path path={cityDots} color={colors.globePin} />
          <Picture picture={thumbnailPicture} />
          <Circle cx={cx} cy={cy} r={r} style="stroke" strokeWidth={1} color={colors.globeRim} />
        </Canvas>
      </GestureDetector>

      <Animated.View style={[styles.mapButtons, mapButtonsStyle]} pointerEvents="box-none">
        <IconButton icon={LocateFixed} label="Recentrer" onPress={recenter} />
        <IconButton
          icon={Plus}
          label="Zoomer"
          onPress={() => zoomWith(zoomIn)}
          onLongPress={() => holdWith(1)}
          onPressOut={() => holdWith(0)}
        />
        <IconButton
          icon={Minus}
          label="Dézoomer"
          onPress={() => zoomWith(zoomOut)}
          onLongPress={() => holdWith(-1)}
          onPressOut={() => holdWith(0)}
        />
      </Animated.View>

      {__DEV__ && (
        <View style={[styles.measure, { top: insets.top + MEASURE_TOP }]} pointerEvents="box-none">
          {measures ? (
            <MeasurePanel
              measures={measures}
              detail={detail}
              onDetail={setDetail}
              onClose={() => setMeasures(null)}
            />
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setMeasures({ fps: 0, msPerFrame: 0, worstFrameMs: 0, points: 0, zoom: zoom.value })}
              style={styles.measureToggle}>
              <Text style={styles.measureToggleText}>fps</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surfacePage,
  },
  mapButtons: {
    position: 'absolute',
    right: layout.screenGutter,
    bottom: layout.screenGutter,
    gap: 10,
  },
  measure: {
    position: 'absolute',
    left: 12,
    right: 12,
    alignItems: 'flex-start',
  },
  measureToggle: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(27,26,23,0.82)',
  },
  measureToggleText: {
    color: colors.textInverse,
    fontFamily: fonts.sansMedium,
    fontSize: 12,
  },
});
