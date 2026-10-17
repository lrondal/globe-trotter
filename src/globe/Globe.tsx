// The globe: Countries drawn with Skia, turned and zoomed by the finger.
//
// Everything that runs per frame stays on the UI thread: the gestures and the inertia
// update shared values through the Globe camera, and the paths are re-projected from
// the geometry the Atlas prepared once. React only renders on layout and on button presses.
import { Canvas, Circle, Path, usePathValue } from '@shopify/react-native-skia';
import { Minus, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { countryGeometry } from '@/atlas';
import { IconButton } from '@/components/IconButton';
import { colors, duration, easing, fonts, layout, radius } from '@/theme/tokens';

import { coast, drag, pinch, release, zoomIn, zoomOut, type Spin, type View as GlobeView } from './camera';
import { MeasurePanel, type Measures } from './MeasurePanel';
import {
  DETAIL,
  frameFor,
  globeCenterY,
  globeRadius,
  traceCountries,
  traceGraticule,
  type Detail,
  type Viewport,
} from './projection';

/** Centred on Europe until the launch position arrives (#16). */
const START: GlobeView = { lon: 10, lat: 45, zoom: 1 };
const zoomTiming = { duration: duration.slow, easing: Easing.bezier(...easing.out) };
/** Measures are reported to the panel this often, in milliseconds. */
const MEASURE_EVERY = 500;

export function Globe() {
  const insets = useSafeAreaInsets();
  const viewport = useSharedValue<Viewport>({ width: 0, height: 0 });
  const lon = useSharedValue(START.lon);
  const lat = useSharedValue(START.lat);
  const zoom = useSharedValue(START.zoom);
  const spin = useSharedValue<Spin | null>(null);
  const pinching = useSharedValue(false);
  const pinchedThisTouch = useSharedValue(false);
  const pinchStartZoom = useSharedValue(START.zoom);

  const [detail, setDetail] = useState<Detail>('standard');
  const [measures, setMeasures] = useState<Measures | null>(null);
  const measuring = measures !== null;
  const tolerance = DETAIL[detail];
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

  const land = usePathValue((path) => {
    'worklet';
    if (viewport.value.width === 0) return;
    const start = performance.now();
    points.value = traceCountries(countryGeometry, frameFor(view(), viewport.value), tolerance, path);
    buildMs.value = performance.now() - start;
  });
  const graticule = usePathValue((path) => {
    'worklet';
    if (viewport.value.width === 0) return;
    traceGraticule(frameFor(view(), viewport.value), path);
  });
  const cx = useDerivedValue(() => viewport.value.width / 2);
  const cy = useDerivedValue(() => globeCenterY(viewport.value));
  const r = useDerivedValue(() => globeRadius(viewport.value) * zoom.value);

  const pan = Gesture.Pan()
    .minDistance(4)
    .averageTouches(true)
    .onBegin(() => {
      // Touching the globe stops it.
      spin.value = null;
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
      cancelAnimation(zoom);
      pinchStartZoom.value = zoom.value;
    })
    .onUpdate((e) => {
      zoom.value = pinch(view(), pinchStartZoom.value, e.scale).zoom;
    })
    .onFinalize(() => {
      pinching.value = false;
    });
  const gestures = Gesture.Simultaneous(pan, pinchGesture);

  useFrameCallback((frame) => {
    'worklet';
    const dt = frame.timeSincePreviousFrame ?? 0;
    const spinning = spin.value;
    if (spinning) {
      const next = coast(view(), spinning, dt);
      turnTo(next.view);
      spin.value = next.spin;
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

  const zoomWith = (step: (v: GlobeView) => GlobeView) => {
    zoom.value = withTiming(step({ lon: lon.value, lat: lat.value, zoom: zoom.value }).zoom, zoomTiming);
  };

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
          <Path path={land} style="stroke" strokeWidth={0.5} color={colors.globeStroke} />
          <Circle cx={cx} cy={cy} r={r} style="stroke" strokeWidth={1} color={colors.globeRim} />
        </Canvas>
      </GestureDetector>

      <View style={styles.mapButtons} pointerEvents="box-none">
        <IconButton icon={Plus} label="Zoomer" onPress={() => zoomWith(zoomIn)} />
        <IconButton icon={Minus} label="Dézoomer" onPress={() => zoomWith(zoomOut)} />
      </View>

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
}

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
