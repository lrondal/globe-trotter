// PROTOTYPE — globe UX on a real iPhone (Expo Go). Throwaway: see README.md.
// Question: does the globe feel right under a finger with the real data (50m countries, ADM1 regions for every country)?
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Canvas, Circle, Group, Path, type SkPath } from '@shopify/react-native-skia';
import {
  GestureDetector,
  GestureHandlerRootView,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import {
  baseRadius, buildPaths, fitZoom, graticulePath, hitTest, loadRegions, loadWorld, makeCull, makeProjection,
  type BuildStats, type Renderer, type Shape, type View as GView,
} from './src/globe';

const C = {
  ocean: '#ECE7DC', land: '#DCD5C6', stroke: '#F4F1EA', rim: '#D3CCBD', grat: '#E0DACD', ink: '#1B1A17',
  visited: '#C4572E', visitedTint: '#F3DDD2', wish: '#E9C48F', wishTint: '#F6E8D2', paper0: '#FBF9F4',
};
// Sample statuses from design-system/ui_kits/mobile/data.js
const VISITED = new Set(['250', '380', '724', '620', '392', '504', '840', '124', '484', '604', '352', '300', '704', '764', '826', '276']);
const WISH = new Set(['578', '032', '554', '404', '036', '360']);

const DEFAULT_VIEW: GView = { lam: -10, phi: -45, k: 1 };
const TOP = 60;
const SNAP = { peek: 0.28, half: 0.52 } as const;
const MIN_K = 0.8, MAX_K = 24;

type LOD = 'auto' | '50m' | '110m';
type Settings = { lod: LOD; renderer: Renderer; inertia: boolean; tolerance: boolean };
type Frame = {
  groups: Record<string, SkPath>; sel?: SkPath; selColor: string; regions: Record<string, SkPath>;
  regionSel?: SkPath; fade: number; grat: SkPath; cx: number; cy: number; r: number;
};

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const wrap = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const x = hex(a), y = hex(b);
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`;
};
const statusOf = (id: string) => (VISITED.has(id) ? 'visited' : WISH.has(id) ? 'wish' : 'unexplored');

export default function App() {
  const world = useMemo(() => {
    const t0 = Date.now();
    const w50 = loadWorld('50m');
    const t1 = Date.now();
    const w110 = loadWorld('110m');
    return { w50, w110, ms50: t1 - t0, ms110: Date.now() - t1 };
  }, []);

  const [size, setSize] = useState({ W: 0, H: 0 });
  const [frame, setFrame] = useState<Frame | null>(null);
  const [settings, setSettings] = useState<Settings>({ lod: 'auto', renderer: 'svg', inertia: true, tolerance: true });
  const [selected, setSelected] = useState<{ country: Shape; region?: Shape } | null>(null);
  const [snap, setSnap] = useState<keyof typeof SNAP>('half');
  const [stats, setStats] = useState({ fps: 0, ms: 0, drawn: 0, regionMs: 0, lod: '50m' });
  const [debugOpen, setDebugOpen] = useState(true);

  // Mutable animation state, read by the frame loop
  const S = useRef({
    view: { ...DEFAULT_VIEW },
    cy: 0,
    dirty: true,
    pinching: false,
    panning: false,
    pinchStartK: 1,
    fly: null as null | { from: GView; to: GView; t0: number },
    vel: null as null | { lam: number; phi: number },
    fade: 0,
    fadeKey: null as string | null,
    regions: null as Shape[] | null,
    lastT: 0,
    frames: 0,
    fpsT: 0,
    msAcc: 0,
    lastDrawn: 0,
    regionMs: 0,
    lastLow: false,
  }).current;
  const live = useRef({ size, settings, selected, snap });
  live.current = { size, settings, selected, snap };

  const sheetH = (sel = live.current.selected, sn = live.current.snap) => (sel ? live.current.size.H * SNAP[sn] : 0);
  const targetCy = () => {
    const { H } = live.current.size;
    const bottom = H - sheetH();
    return TOP + (bottom - TOP) / 2;
  };

  useEffect(() => { S.dirty = true; }, [settings, selected, snap]);

  // Frame loop
  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const { size: { W, H }, settings: st, selected: sel } = live.current;
      if (!W) return;
      const dt = S.lastT ? Math.min(64, now - S.lastT) : 16;
      S.lastT = now;
      let moving = S.panning || S.pinching;

      if (S.fly) {
        const t = Math.min(1, (now - S.fly.t0) / 900);
        const e = easeInOut(t);
        const { from, to } = S.fly;
        S.view = { lam: from.lam + wrap(to.lam - from.lam) * e, phi: from.phi + (to.phi - from.phi) * e, k: from.k + (to.k - from.k) * e };
        if (t >= 1) S.fly = null;
        S.dirty = true; moving = true;
      } else if (S.vel) {
        S.view.lam += S.vel.lam * (dt / 1000);
        S.view.phi = Math.max(-85, Math.min(85, S.view.phi + S.vel.phi * (dt / 1000)));
        const decay = Math.exp(-dt / 325);
        S.vel.lam *= decay; S.vel.phi *= decay;
        if (Math.hypot(S.vel.lam, S.vel.phi) < 1) S.vel = null;
        S.dirty = true; moving = true;
      }

      const cyT = targetCy();
      if (!S.cy) S.cy = cyT;
      if (Math.abs(cyT - S.cy) > 0.5) { S.cy += (cyT - S.cy) * 0.14; S.dirty = true; }

      // Region fade: out from the old country, then in for the new one
      const key = sel?.country.key ?? null;
      if (key !== S.fadeKey) {
        if (S.fade > 0.02) { S.fade = Math.max(0, S.fade - 0.12); S.dirty = true; }
        else {
          S.fade = 0; S.fadeKey = key; S.regions = null;
          if (key) {
            const t0 = Date.now();
            S.regions = loadRegions(key);
            S.regionMs = Date.now() - t0;
          }
          S.dirty = true;
        }
      } else {
        const want = key && S.regions ? 1 : 0;
        if (Math.abs(want - S.fade) > 0.01) { S.fade += (want - S.fade) * 0.12; S.dirty = true; }
        else S.fade = want;
      }

      // After motion stops in auto LOD, redraw once at full detail
      if (st.lod === 'auto' && !moving && S.lastLow) S.dirty = true;
      if (!S.dirty) {
        if (now - S.fpsT > 500) { S.frames = 0; S.msAcc = 0; S.fpsT = now; }
        return;
      }
      S.dirty = false;

      const useLow = st.lod === '110m' || (st.lod === 'auto' && moving);
      S.lastLow = useLow;
      const shapes = useLow ? world.w110 : world.w50;
      const t0 = performance.now();
      const proj = makeProjection(S.view, W, H, S.cy);
      const vis = makeCull(proj, W, H, S.cy);
      const bs: BuildStats = { drawn: 0, ms: 0 };
      const selKey = sel?.country.key;
      const groups = buildPaths(proj, shapes, (s) => (s.key === selKey ? null : statusOf(s.key)), vis, st.renderer, bs);
      let selPath: SkPath | undefined;
      let selColor = C.land;
      if (sel) {
        const selShape = shapes.find((s) => s.key === selKey) ?? sel.country;
        selPath = buildPaths(proj, [selShape], () => 'sel', vis, st.renderer, bs).sel;
        const stt = statusOf(sel.country.key);
        const t = S.fadeKey === selKey ? S.fade : 0;
        selColor = stt === 'visited' ? mix(C.visited, C.visitedTint, t) : stt === 'wish' ? mix(C.wish, C.wishTint, t) : C.land;
      }
      let regions: Record<string, SkPath> = {};
      let regionSel: SkPath | undefined;
      if (S.regions && S.fade > 0.01) {
        regions = buildPaths(proj, S.regions, () => 'all', vis, st.renderer, bs);
        if (sel?.region) regionSel = buildPaths(proj, [sel.region], () => 'sel', vis, st.renderer, bs).sel;
      }
      const grat = graticulePath(proj);
      const ms = performance.now() - t0;

      S.frames++; S.msAcc += ms; S.lastDrawn = bs.drawn;
      if (now - S.fpsT > 500) {
        setStats({ fps: Math.round((S.frames * 1000) / (now - S.fpsT)), ms: +(S.msAcc / S.frames).toFixed(1), drawn: S.lastDrawn, regionMs: S.regionMs, lod: useLow ? '110m' : '50m' });
        S.frames = 0; S.msAcc = 0; S.fpsT = now;
      }
      setFrame({ groups, sel: selPath, selColor, regions, regionSel, fade: S.fade, grat, cx: W / 2, cy: S.cy, r: baseRadius(W, H) * S.view.k });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [world]);

  const flyTo = (to: GView) => { S.vel = null; S.fly = { from: { ...S.view }, to, t0: performance.now() }; };

  const select = (country: Shape, region?: Shape) => {
    const { W, H } = live.current.size;
    const sn = region ? 'peek' : 'half';
    setSnap(sn);
    setSelected({ country, region });
    if (region) return; // regions keep the current framing
    const sh = H * SNAP[sn];
    const f = fitZoom(country, W, H, W, Math.max(120, H - sh - TOP));
    flyTo({ lam: -f.lon, phi: -f.lat, k: f.k });
  };

  const onTap = (x: number, y: number) => {
    const { size: { W, H }, settings: st, selected: sel } = live.current;
    const proj = makeProjection(S.view, W, H, S.cy);
    const tol = st.tolerance ? 14 : 0;
    if (sel && S.regions && S.fade > 0.5) {
      const inCountry = hitTest(proj, [sel.country], x, y, 0);
      if (inCountry) {
        const r = hitTest(proj, S.regions, x, y, 0);
        if (r) return select(sel.country, r);
      }
    }
    const c = hitTest(proj, world.w50, x, y, tol);
    if (c) select(c);
    else setSelected(null);
  };

  const pan = usePanGesture({
    runOnJS: true,
    minDistance: 4,
    onBegin: () => { S.fly = null; S.vel = null; },
    onActivate: () => { S.panning = true; },
    onUpdate: (e) => {
      if (S.pinching) return;
      const f = 75 / (baseRadius(live.current.size.W, live.current.size.H) * S.view.k);
      S.view.lam += e.changeX * f;
      S.view.phi = Math.max(-85, Math.min(85, S.view.phi - e.changeY * f));
      S.dirty = true;
    },
    onDeactivate: (e) => {
      S.panning = false;
      S.dirty = true;
      if (!live.current.settings.inertia || S.pinching) return;
      const f = 75 / (baseRadius(live.current.size.W, live.current.size.H) * S.view.k);
      S.vel = { lam: e.velocityX * f, phi: -e.velocityY * f };
    },
  });
  const pinch = usePinchGesture({
    runOnJS: true,
    onActivate: () => { S.pinching = true; S.fly = null; S.vel = null; S.pinchStartK = S.view.k; },
    onUpdate: (e) => { S.view.k = Math.max(MIN_K, Math.min(MAX_K, S.pinchStartK * e.scale)); S.dirty = true; },
    onDeactivate: () => { S.pinching = false; S.dirty = true; },
  });
  const tap = useTapGesture({ runOnJS: true, maxDistance: 10, onActivate: (e) => onTap(e.x, e.y) });
  const gesture = useSimultaneousGestures(pan, pinch, tap);

  const zoomBy = (m: number) => flyTo({ ...S.view, k: Math.max(MIN_K, Math.min(MAX_K, S.view.k * m)) });
  const sel = selected;
  const selStatus = sel ? statusOf(sel.country.key) : null;
  const toggle = <K extends keyof Settings>(k: K, v: Settings[K]) => setSettings((s) => ({ ...s, [k]: v }));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <View style={styles.root} onLayout={(e) => setSize({ W: e.nativeEvent.layout.width, H: e.nativeEvent.layout.height })}>
        <GestureDetector gesture={gesture}>
          <View style={StyleSheet.absoluteFill}>
            {frame && (
              <Canvas style={StyleSheet.absoluteFill}>
                <Circle cx={frame.cx} cy={frame.cy} r={frame.r} color={C.ocean} />
                <Path path={frame.grat} style="stroke" strokeWidth={0.5} color={C.grat} />
                {(['unexplored', 'visited', 'wish'] as const).map((g) =>
                  frame.groups[g] ? (
                    <Group key={g}>
                      <Path path={frame.groups[g]} color={g === 'visited' ? C.visited : g === 'wish' ? C.wish : C.land} />
                      <Path path={frame.groups[g]} style="stroke" strokeWidth={0.5} color={C.stroke} />
                    </Group>
                  ) : null,
                )}
                {frame.sel && <Path path={frame.sel} color={frame.selColor} />}
                {frame.regions.all && (
                  <Path path={frame.regions.all} style="stroke" strokeWidth={0.6} color={C.paper0} opacity={frame.fade * 0.9} />
                )}
                {frame.regionSel && <Path path={frame.regionSel} color={C.visited} opacity={0.35 * frame.fade} />}
                {frame.regionSel && <Path path={frame.regionSel} style="stroke" strokeWidth={1.2} color={C.ink} opacity={frame.fade} />}
                {frame.sel && <Path path={frame.sel} style="stroke" strokeWidth={1.5} color={C.ink} />}
                <Circle cx={frame.cx} cy={frame.cy} r={frame.r} style="stroke" strokeWidth={1} color={C.rim} />
              </Canvas>
            )}
          </View>
        </GestureDetector>

        <View style={[styles.mapButtons, { bottom: (sel ? size.H * SNAP[snap] : 0) + 24 }]} pointerEvents="box-none">
          <RoundButton label="⌖" onPress={() => flyTo({ ...DEFAULT_VIEW })} />
          <RoundButton label="+" onPress={() => zoomBy(1.6)} />
          <RoundButton label="−" onPress={() => zoomBy(1 / 1.6)} />
        </View>

        {sel && (
          <View style={[styles.sheet, { height: size.H * SNAP[snap] }]}>
            <Pressable onPress={() => setSnap(snap === 'half' ? 'peek' : 'half')} hitSlop={12} style={styles.handleWrap}>
              <View style={styles.handle} />
            </Pressable>
            <Text style={styles.overline}>{sel.region ? sel.country.name : 'PROTOTYPE · fiche simplifiée'}</Text>
            <Text style={styles.title}>{sel.region ? sel.region.name : sel.country.name}</Text>
            <Text style={styles.meta}>
              {selStatus === 'visited' ? 'Visité' : selStatus === 'wish' ? 'À visiter' : 'Non exploré'}
              {S.regions ? ` · ${S.regions.length} régions` : ' · pas de régions'}
            </Text>
            <Pressable style={styles.close} onPress={() => setSelected(null)}>
              <Text style={styles.closeText}>Fermer</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.debug}>
          <Pressable onPress={() => setDebugOpen(!debugOpen)}>
            <Text style={styles.debugTitle}>
              {stats.fps} fps · {stats.ms} ms/img · {stats.lod} · zoom {S.view.k.toFixed(1)} {debugOpen ? '▾' : '▸'}
            </Text>
          </Pressable>
          {debugOpen && (
            <>
              <Text style={styles.debugText}>
                pays dessinés {stats.drawn} · chargement 50m {world.ms50} ms / 110m {world.ms110} ms · régions {stats.regionMs} ms
              </Text>
              <View style={styles.row}>
                <Chip label="Détail: auto" on={settings.lod === 'auto'} onPress={() => toggle('lod', 'auto')} />
                <Chip label="50m" on={settings.lod === '50m'} onPress={() => toggle('lod', '50m')} />
                <Chip label="110m" on={settings.lod === '110m'} onPress={() => toggle('lod', '110m')} />
              </View>
              <View style={styles.row}>
                <Chip label="Rendu SVG" on={settings.renderer === 'svg'} onPress={() => toggle('renderer', 'svg')} />
                <Chip label="Rendu Builder" on={settings.renderer === 'builder'} onPress={() => toggle('renderer', 'builder')} />
              </View>
              <View style={styles.row}>
                <Chip label="Inertie" on={settings.inertia} onPress={() => toggle('inertia', !settings.inertia)} />
                <Chip label="Tap tolérant" on={settings.tolerance} onPress={() => toggle('tolerance', !settings.tolerance)} />
              </View>
            </>
          )}
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

function RoundButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.round, pressed && { transform: [{ scale: 0.94 }] }]}>
      <Text style={styles.roundText}>{label}</Text>
    </Pressable>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F1EA' },
  mapButtons: { position: 'absolute', right: 20, gap: 10 },
  round: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: C.paper0, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.ink, shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 6 },
  },
  roundText: { fontSize: 22, color: C.ink },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.paper0, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingHorizontal: 20, shadowColor: C.ink, shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: -10 },
  },
  handleWrap: { alignItems: 'center', paddingVertical: 10 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#D3CCBD' },
  overline: { fontSize: 11, fontWeight: '500', letterSpacing: 0.9, color: '#6E6A60', textTransform: 'uppercase' },
  title: { fontSize: 34, color: C.ink, marginTop: 4, fontFamily: 'Georgia' },
  meta: { fontSize: 13, color: '#6E6A60', marginTop: 6 },
  close: { position: 'absolute', right: 20, top: 20, borderWidth: 1, borderColor: '#D3CCBD', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 6 },
  closeText: { fontSize: 13, color: C.ink },
  debug: { position: 'absolute', top: 54, left: 12, right: 12, backgroundColor: 'rgba(27,26,23,0.82)', borderRadius: 10, padding: 8 },
  debugTitle: { color: '#fff', fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  debugText: { color: '#ddd', fontSize: 11, marginTop: 4 },
  row: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: '#777', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  chipOn: { backgroundColor: '#fff', borderColor: '#fff' },
  chipText: { color: '#ddd', fontSize: 11 },
  chipTextOn: { color: C.ink },
});
