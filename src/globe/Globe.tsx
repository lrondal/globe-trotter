// The globe: Countries drawn with Skia, turned and zoomed by the finger.
//
// Everything that runs per frame stays on the UI thread: the gestures, the inertia and the
// flight to a selected Country update shared values through the Globe camera, and the paths
// are re-projected from the geometry the Atlas prepared once. React only renders on layout
// and on button presses: selecting a Country is told to the parent, and the globe is memoised
// so the sheet re-rendering never rebuilds its gestures and paths mid-flight.
//
// The selected Country's Regions are handed over by the parent once loaded, and fade in over
// it while it fades to its tint: the flight never waits for them. The Journal's Cities are
// ink dots, drawn over everything but the rim. A long press tells the parent the point of
// the globe under the finger, where a Custom City goes.
import { Canvas, Circle, Group, notifyChange, Path, Skia, usePathValue } from '@shopify/react-native-skia';
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
import { colors, duration, easing, fonts, layout, radius } from '@/theme/tokens';

import {
  centerOn,
  coast,
  drag,
  fit,
  fly,
  holdZoom,
  pinch,
  release,
  zoomIn,
  zoomOut,
  type Point,
  type Shot,
  type Spin,
  type View as GlobeView,
} from './camera';
import { countryAt } from './hitTest';
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

const zoomTiming = { duration: duration.slow, easing: Easing.bezier(...easing.out) };
/** How the Regions and the tint of their Country fade in and out. */
const fadeTiming = { duration: duration.base, easing: Easing.bezier(...easing.out) };
/** Regions can be tapped once they have faded in this far. */
const REGIONS_TAPPABLE = 0.5;
/** The Regions' hairlines, in points. */
const REGION_STROKE = 0.6;
/** The location dot: a 6 pt sage dot with a thin paper ring, in points. */
const LOCATION_RADIUS = 3;
const LOCATION_RING = 1.5;
/** A City: a 7 pt ink dot with a 1.2 pt paper ring, in points. */
const CITY_RADIUS = 3.5;
const CITY_RING = 1.2;
/** Measures are reported to the panel this often, in milliseconds. */
const MEASURE_EVERY = 500;
/** One path per colour layer, in LAYER order. */
const LAYERS = Object.values(LAYER);
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

export type GlobeHandle = {
  /**
   * Flies to the Country at this index in the Atlas and opens its sheet, as a tap on it does;
   * framing `footprint` rather than the Country when given, a City of it say.
   */
  select(country: number, footprint?: Footprint): void;
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
  /** Index of the Region tapped, in the geometry of `regions`. */
  onSelectRegion: (region: number) => void;
  /** The points of the Journal's Cities. */
  cities: SharedValue<Point[]>;
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

  const [detail, setDetail] = useState<Detail>('standard');
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

  const select = (country: number, footprint?: Footprint) => {
    'worklet';
    const screenHeight = viewport.value.height;
    const half = detentHeight('half', screenHeight);
    const to = fit(footprint ?? footprintOf(countryGeometry, country), viewport.value, screenHeight - half);
    // Another Country's Regions go at once; the same Country's stay.
    if (country !== selectedCountry.value) {
      cancelAnimation(fade);
      fade.value = 0;
    }
    selectedCountry.value = country;
    spin.value = null;
    holding.value = 0;
    cancelAnimation(zoom);
    cancelAnimation(lift);
    flight.value = { from: { view: view(), lift: lift.value }, to, elapsed: 0 };
    sheetHeight.value = withTiming(half, sheetTiming);
    scheduleOnRN(onSelect, country);
  };
  // Its Regions fade out with it.
  const letGo = () => {
    'worklet';
    selectedCountry.value = -1;
    fade.value = withTiming(0, fadeTiming);
  };
  const deselect = () => {
    'worklet';
    letGo();
    flight.value = null;
    lift.value = withTiming(0, sheetTiming);
    sheetHeight.value = withTiming(0, sheetTiming);
  };
  // A flight cut short by a gesture still lifts the globe above the sheet it opened.
  const stopFlight = () => {
    'worklet';
    const flying = flight.value;
    if (!flying) return;
    flight.value = null;
    lift.value = withTiming(flying.to.lift, sheetTiming);
  };
  // A Region opens its sheet at peek height, over its Country still framed.
  const selectRegion = (region: number) => {
    'worklet';
    sheetHeight.value = withTiming(detentHeight('peek', viewport.value.height), sheetTiming);
    scheduleOnRN(onSelectRegion, region);
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
  // The selected Country's Regions, likewise, in the same layers.
  const regionBuilders = useSharedValue(useMemo(() => LAYERS.map(() => Skia.PathBuilder.Make()), []));
  const regionPaths = useSharedValue(useMemo(() => LAYERS.map(() => Skia.Path.Make()), []));
  useDerivedValue(() => {
    if (viewport.value.width === 0) return;
    const sinks = builders.value;
    for (const sink of sinks) sink.reset();
    const start = performance.now();
    const camera = frameFor({ lon: lon.value, lat: lat.value, zoom: zoom.value }, viewport.value, lift.value);
    let drawn = traceCountries(countryGeometry, camera, detailArea, sinks, layers.value);
    landPaths.value = sinks.map((sink) => sink.build());
    const shown = regions.value;
    const shownLayers = regionLayers.value;
    // Their layers may arrive a frame before or after them: never draw one with the other's.
    if (fade.value > 0 && shown && shownLayers?.country === shown.country) {
      const regionSinks = regionBuilders.value;
      for (const sink of regionSinks) sink.reset();
      drawn += traceCountries(shown.geometry, camera, detailArea, regionSinks, shownLayers.layers);
      regionPaths.value = regionSinks.map((sink) => sink.build());
      notifyChange(regionPaths);
    }
    points.value = drawn;
    buildMs.value = performance.now() - start;
    notifyChange(landPaths);
  });
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

  const tap = Gesture.Tap()
    .maxDistance(10)
    .onEnd((e, success) => {
      if (!success) return;
      const f = frame();
      const country = countryAt(countryGeometry, f, detailArea, e.x, e.y);
      // Inside the selected Country, once its Regions show, a tap picks one of them.
      const shown = regions.value;
      if (country >= 0 && country === selectedCountry.value && shown?.country === country && fade.value > REGIONS_TAPPABLE) {
        const region = countryAt(shown.geometry, f, detailArea, e.x, e.y);
        if (region >= 0) {
          selectRegion(region);
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
    })
    .onEnd((e) => {
      // Lifting the fingers after a pinch, without dragging since, leaves the globe still.
      if (pinchedThisTouch.value && dragSlack.value > 0) return;
      spin.value = release(view(), e.velocityX, e.velocityY, globeRadius(viewport.value));
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
            {[regionLand, regionVisited, regionWish, regionOutline].map((path, i) => (
              <Path key={i} path={path} style="stroke" strokeWidth={REGION_STROKE} color={colors.paper0} />
            ))}
          </Group>
          <Group opacity={dotOpacity}>
            <Circle cx={dotX} cy={dotY} r={LOCATION_RADIUS + LOCATION_RING} color={colors.paper0} />
            <Circle cx={dotX} cy={dotY} r={LOCATION_RADIUS} color={colors.globeLocation} />
          </Group>
          <Path path={cityRings} color={colors.paper0} />
          <Path path={cityDots} color={colors.globePin} />
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
