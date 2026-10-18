// The globe: Countries drawn with Skia, turned and zoomed by the finger.
//
// Everything that runs per frame stays on the UI thread: the gestures, the inertia and the
// flight to a selected Country update shared values through the Globe camera, and the paths
// are re-projected from the geometry the Atlas prepared once. React only renders on layout
// and on button presses: selecting a Country is told to the parent, and the globe is memoised
// so the sheet re-rendering never rebuilds its gestures and paths mid-flight.
import { Canvas, Circle, Group, notifyChange, Path, Skia, usePathValue } from '@shopify/react-native-skia';
import { LocateFixed, Minus, Plus } from 'lucide-react-native';
import { memo, useEffect, useImperativeHandle, useMemo, useState, type Ref } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { countryGeometry, footprintOf } from '@/atlas';
import { IconButton } from '@/components/IconButton';
import { detentHeight, sheetTiming } from '@/sheet/detents';
import { colors, duration, easing, fonts, layout, radius } from '@/theme/tokens';

import {
  centerOn,
  coast,
  drag,
  fit,
  fly,
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
  frameFor,
  globeCenterY,
  globeRadius,
  projectPoint,
  traceCountries,
  traceGraticule,
  type Detail,
  type Viewport,
} from './projection';

const zoomTiming = { duration: duration.slow, easing: Easing.bezier(...easing.out) };
/** The location dot: a 6 pt sage dot with a thin paper ring, in points. */
const LOCATION_RADIUS = 3;
const LOCATION_RING = 1.5;
/** Measures are reported to the panel this often, in milliseconds. */
const MEASURE_EVERY = 500;
/** One path per colour layer, in LAYER order. */
const LAYERS = Object.values(LAYER);

export type GlobeHandle = {
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
  ref?: Ref<GlobeHandle>;
};

export const Globe = memo(function Globe({ start, position, onRecenter, sheetHeight, onSelect, layers, ref }: Props) {
  const insets = useSafeAreaInsets();
  const viewport = useSharedValue<Viewport>({ width: 0, height: 0 });
  const lon = useSharedValue(start.lon);
  const lat = useSharedValue(start.lat);
  const zoom = useSharedValue(start.zoom);
  const lift = useSharedValue(0);
  const spin = useSharedValue<Spin | null>(null);
  const flight = useSharedValue<{ from: Shot; to: Shot; elapsed: number } | null>(null);
  const pinching = useSharedValue(false);
  const pinchedThisTouch = useSharedValue(false);
  const pinchStartZoom = useSharedValue(start.zoom);
  const shownPosition = useSharedValue(position);

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

  const select = (country: number) => {
    'worklet';
    const screenHeight = viewport.value.height;
    const half = detentHeight('half', screenHeight);
    const to = fit(footprintOf(countryGeometry, country), viewport.value, screenHeight - half);
    spin.value = null;
    cancelAnimation(zoom);
    cancelAnimation(lift);
    flight.value = { from: { view: view(), lift: lift.value }, to, elapsed: 0 };
    sheetHeight.value = withTiming(half, sheetTiming);
    scheduleOnRN(onSelect, country);
  };
  const deselect = () => {
    'worklet';
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
  // Recentring lets go of the selected Country: the whole globe faces the point, sheet closed.
  const flyTo = (point: Point) => {
    'worklet';
    spin.value = null;
    cancelAnimation(zoom);
    cancelAnimation(lift);
    flight.value = { from: { view: view(), lift: lift.value }, to: { view: centerOn(view(), point), lift: 0 }, elapsed: 0 };
    sheetHeight.value = withTiming(0, sheetTiming);
    scheduleOnRN(onSelect, null);
  };
  // On the UI thread, so it cannot interleave with a frame of the flight.
  useImperativeHandle(ref, () => ({ deselect: () => scheduleOnUI(deselect) }), []);

  // The paths may read the camera through frame(): usePathValue notifies its own path,
  // so it re-runs every frame whatever its callback reads. Derived values do not.
  // The Countries are traced once per frame into one path per colour layer, built here like
  // usePathValue builds its one path, and the camera and layers are read directly.
  const builders = useSharedValue(useMemo(() => LAYERS.map(() => Skia.PathBuilder.Make()), []));
  const landPaths = useSharedValue(useMemo(() => LAYERS.map(() => Skia.Path.Make()), []));
  useDerivedValue(() => {
    if (viewport.value.width === 0) return;
    const camera = { lon: lon.value, lat: lat.value, zoom: zoom.value };
    const sinks = builders.value;
    for (const sink of sinks) sink.reset();
    const start = performance.now();
    points.value = traceCountries(countryGeometry, frameFor(camera, viewport.value, lift.value), detailArea, sinks, layers.value);
    landPaths.value = sinks.map((sink) => sink.build());
    buildMs.value = performance.now() - start;
    notifyChange(landPaths);
  });
  const land = useDerivedValue(() => landPaths.value[LAYER.land]);
  const visited = useDerivedValue(() => landPaths.value[LAYER.visited]);
  const wish = useDerivedValue(() => landPaths.value[LAYER.wish]);
  const outlineOnly = useDerivedValue(() => landPaths.value[LAYER.outline]);
  const graticule = usePathValue((path) => {
    'worklet';
    if (viewport.value.width === 0) return;
    traceGraticule(frame(), path);
  });
  const cx = useDerivedValue(() => viewport.value.width / 2);
  const cy = useDerivedValue(() => globeCenterY(viewport.value) - lift.value);
  const r = useDerivedValue(() => globeRadius(viewport.value) * zoom.value);

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

  const tap = Gesture.Tap()
    .maxDistance(10)
    .onEnd((e, success) => {
      if (!success) return;
      const country = countryAt(countryGeometry, frame(), detailArea, e.x, e.y);
      if (country >= 0) {
        select(country);
      } else {
        deselect();
        scheduleOnRN(onSelect, null);
      }
    });
  const pan = Gesture.Pan()
    .minDistance(4)
    .averageTouches(true)
    .onBegin(() => {
      // Touching the globe stops it, in flight too.
      spin.value = null;
      stopFlight();
      pinchedThisTouch.value = false;
    })
    .onChange((e) => {
      if (pinching.value) return;
      turnTo(drag(view(), e.changeX, e.changeY, globeRadius(viewport.value)));
    })
    .onEnd((e) => {
      if (pinchedThisTouch.value) return;
      spin.value = release(view(), e.velocityX, e.velocityY, globeRadius(viewport.value));
    });
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      pinching.value = true;
      pinchedThisTouch.value = true;
      spin.value = null;
      stopFlight();
      cancelAnimation(zoom);
      pinchStartZoom.value = zoom.value;
    })
    .onUpdate((e) => {
      zoom.value = pinch(view(), pinchStartZoom.value, e.scale).zoom;
    })
    .onFinalize(() => {
      pinching.value = false;
    });
  // A tap fails as soon as the finger moves enough to turn the globe.
  const gestures = Gesture.Race(Gesture.Simultaneous(pan, pinchGesture), tap);

  useFrameCallback((frame) => {
    'worklet';
    const dt = frame.timeSincePreviousFrame ?? 0;
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
          {[land, visited, wish, outlineOnly].map((path, i) => (
            <Path key={i} path={path} style="stroke" strokeWidth={0.5} color={colors.globeStroke} />
          ))}
          <Group opacity={dotOpacity}>
            <Circle cx={dotX} cy={dotY} r={LOCATION_RADIUS + LOCATION_RING} color={colors.paper0} />
            <Circle cx={dotX} cy={dotY} r={LOCATION_RADIUS} color={colors.globeLocation} />
          </Group>
          <Circle cx={cx} cy={cy} r={r} style="stroke" strokeWidth={1} color={colors.globeRim} />
        </Canvas>
      </GestureDetector>

      <Animated.View style={[styles.mapButtons, mapButtonsStyle]} pointerEvents="box-none">
        <IconButton icon={LocateFixed} label="Recentrer" onPress={recenter} />
        <IconButton icon={Plus} label="Zoomer" onPress={() => zoomWith(zoomIn)} />
        <IconButton icon={Minus} label="Dézoomer" onPress={() => zoomWith(zoomOut)} />
      </Animated.View>

      {__DEV__ && (
        <View style={[styles.measure, { top: insets.top + 8 }]} pointerEvents="box-none">
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
