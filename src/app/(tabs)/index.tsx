import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { atlas, countries, countryGeometry, footprintOf, places } from '@/atlas';
import { FilterChip } from '@/components/FilterChip';
import { STATUS_LABEL } from '@/components/StatusBadge';
import { Toast } from '@/components/Toast';
import type { Point } from '@/globe/camera';
import { Globe, type GlobeHandle, type ShownRegions } from '@/globe/Globe';
import { layerOf, type Filters, type Layer } from '@/globe/layers';
import { useShowOnGlobe } from '@/globe/ShowOnGlobeProvider';
import type { Journal, Mark, PlaceRef, Status } from '@/journal/journal';
import { useJournal } from '@/journal/JournalProvider';
import { recenterAction } from '@/location/launch';
import { useLocation } from '@/location/LocationProvider';
import { detentHeight } from '@/sheet/detents';
import { PlaceSheet, type SheetPlace } from '@/sheet/PlaceSheet';
import { colors, layout, radius, shadow, text } from '@/theme/tokens';

/** `key` gives every notice its own toast, so its 3.2 s start over even for the same message. */
type Notice = { key: number; message: string; action?: string; onAction?: () => void };

const turnOnLocation = {
  message: 'La localisation est désactivée pour Globe trotter. Activez-la dans Réglages.',
  action: 'Réglages',
  onAction: () => Linking.openSettings(),
};
const noPosition = {
  message: 'Position introuvable. Vérifiez que le service de localisation est activé dans Réglages.',
};

const STATUSES: Status[] = ['visited', 'wish', 'unexplored'];
const ALL_SHOWN: Filters = { visited: true, wish: true, unexplored: true };

/** The colour layer of every Country and Island, by its index in the Atlas. */
const layersOf = (journal: Journal, filters: Filters, selected: number | null) =>
  places.map((place, i) => layerOf(journal.status(place), filters, i === selected));

/** The Regions of the selected Country, as the Globe draws them and the sheet names them. */
type Regions = { country: number; list: { id: string; name: string }[] };

const regionRef = (id: string): PlaceRef => ({ level: 'region', id });

/** The colour layer of each Region of `regions`, in their order. */
const regionLayersOf = (journal: Journal, filters: Filters, regions: Regions) =>
  regions.list.map(({ id }) => layerOf(journal.status(regionRef(id)), filters));

/** The name of a Place, for the provenance of a Status. */
const nameOf = (place: PlaceRef) =>
  place.level === 'region' ? (atlas.region(place.id)?.name ?? '') : (countries.find((c) => c.id === place.id)?.name ?? '');

export default function GlobeScreen() {
  const { launch, position, permission, request, locate } = useLocation();
  const { journal, version, mark, undo } = useJournal();
  const globe = useRef<GlobeHandle>(null);
  const sheetHeight = useSharedValue(0);
  const [screenHeight, setScreenHeight] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  /** The Regions of the selected Country, once loaded, and the one selected among them. */
  const [regions, setRegions] = useState<Regions | null>(null);
  const [region, setRegion] = useState<number | null>(null);
  const [filters, setFilters] = useState(ALL_SHOWN);
  const [notice, setNotice] = useState<Notice | null>(null);
  const noticeKey = useRef(0);
  const notify = useCallback((next: Omit<Notice, 'key'>) => setNotice({ ...next, key: ++noticeKey.current }), []);
  const hideNotice = useCallback(() => setNotice(null), []);

  // Written from here, read by the globe on the UI thread: marking never re-renders the globe.
  const layers = useSharedValue(useMemo(() => layersOf(journal, ALL_SHOWN, null), [journal]));
  useEffect(() => {
    layers.value = layersOf(journal, filters, selected);
  }, [layers, journal, version, filters, selected]);
  const counts = journal.counts();

  // The selected Country's Regions, loaded and decoded on the JS thread while the globe flies
  // on the UI thread, then handed to it with their colours.
  const shownRegions = useSharedValue<ShownRegions | null>(null);
  const regionLayers = useSharedValue<Layer[]>([]);
  useEffect(() => {
    if (selected === null || countries[selected].countryId) return;
    let current = true;
    atlas.regionGeometry(countries[selected].id).then((loaded) => {
      if (!current || !loaded) return;
      shownRegions.value = { country: selected, geometry: loaded.geometry };
      setRegions({ country: selected, list: loaded.regions });
    });
    return () => {
      current = false;
    };
  }, [shownRegions, selected]);
  // Their colours, which the globe waits for before drawing them.
  useEffect(() => {
    regionLayers.value = regions ? regionLayersOf(journal, filters, regions) : [];
  }, [regionLayers, journal, version, filters, regions]);

  /** The Place the sheet shows: the selected Region, or else the selected Country or Island. */
  const sheetRef: PlaceRef | null =
    selected === null
      ? null
      : region !== null && regions?.country === selected
        ? regionRef(regions.list[region].id)
        : places[selected];

  const place = useMemo<SheetPlace | null>(() => {
    if (selected === null || !sheetRef) return null;
    const own = sheetRef.level === 'region' ? atlas.region(sheetRef.id) : null;
    const { lon, lat } = own ?? footprintOf(countryGeometry, selected);
    return {
      name: own?.name ?? countries[selected].name,
      overline: own ? countries[selected].name : undefined,
      lon,
      lat,
      status: journal.status(sheetRef),
      via: journal.via(sheetRef).map(nameOf),
      canRemove: journal.canRemoveMark(sheetRef),
      note: journal.place(sheetRef)?.note ?? '',
    };
    // sheetRef is rebuilt every render: its parts are the dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, region, regions, journal, version]);

  // The location link of a Note, say: fly to its Place and open its sheet.
  const { pending, shown } = useShowOnGlobe();
  useEffect(() => {
    if (!pending) return;
    // A Region is shown by its Country.
    const target = pending.level === 'region' ? { level: 'country', id: atlas.region(pending.id)?.countryId } : pending;
    const index = places.findIndex((p) => p.level === target.level && p.id === target.id);
    if (index >= 0) globe.current?.select(index);
    shown();
  }, [pending, shown]);

  const onOpenNote = () => {
    if (!sheetRef) return;
    router.push({ pathname: '/note/[level]/[id]', params: sheetRef });
  };

  // A Country, an Island or the sea: any Region selected goes.
  const onSelect = useCallback((country: number | null) => {
    setSelected(country);
    setRegion(null);
  }, []);
  const onClose = useCallback(() => {
    globe.current?.deselect();
    onSelect(null);
  }, [onSelect]);
  const onMark = (next: Mark | null) => {
    if (!sheetRef || !place) return;
    mark(sheetRef, next);
    const status: Status = next ?? 'unexplored';
    notify({ message: `${place.name} · ${STATUS_LABEL[status]}`, action: 'Annuler', onAction: undo });
  };

  // Stable between renders, so the memoised globe only re-renders when the position moves.
  const recenter = useCallback(async (): Promise<Point | null> => {
    const locateOrExplain = async () => {
      const point = await locate();
      if (!point) notify(noPosition);
      return point;
    };
    switch (recenterAction(position, permission)) {
      case 'fly':
        return position;
      case 'locate':
        return locateOrExplain();
      case 'ask':
        return (await request()).granted ? locateOrExplain() : null;
      case 'explain':
        notify(turnOnLocation);
        return null;
    }
  }, [position, permission, request, locate, notify]);

  // Rises with the sheet up to its half height, like the map buttons, so a toast stays above it.
  const bottomLeftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.min(sheetHeight.value, detentHeight('half', screenHeight)) }],
  }));

  // The root layout only shows the routes once the launch view is known.
  if (!launch) return null;

  const journalIsEmpty = counts.visited + counts.wish === 0;

  return (
    <View style={styles.screen} onLayout={(e) => setScreenHeight(e.nativeEvent.layout.height)}>
      <Globe
        ref={globe}
        start={launch}
        position={position}
        onRecenter={recenter}
        sheetHeight={sheetHeight}
        onSelect={onSelect}
        layers={layers}
        regions={shownRegions}
        regionLayers={regionLayers}
        onSelectRegion={setRegion}
      />
      {screenHeight > 0 && (
        <PlaceSheet
          height={sheetHeight}
          screenHeight={screenHeight}
          place={place}
          onClose={onClose}
          onMark={onMark}
          onOpenNote={onOpenNote}
        />
      )}
      {/* Beside the map buttons; above the sheet, so the toast of a Mark shows over it. */}
      <Animated.View style={[styles.bottomLeft, bottomLeftStyle]} pointerEvents="box-none">
        {notice ? (
          <Toast
            key={notice.key}
            message={notice.message}
            action={notice.action}
            onAction={notice.onAction}
            onHide={hideNotice}
          />
        ) : (
          journalIsEmpty &&
          selected === null && (
            <View style={styles.hint}>
              <Text style={styles.hintText}>Touchez un pays pour commencer</Text>
            </View>
          )
        )}
        {selected === null && (
          <View style={styles.chips}>
            {STATUSES.map((status) => (
              <FilterChip
                key={status}
                status={status}
                count={counts[status]}
                selected={filters[status]}
                onPress={() => setFilters((f) => ({ ...f, [status]: !f[status] }))}
              />
            ))}
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const MAP_BUTTON_GAP = 10;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bottomLeft: {
    position: 'absolute',
    left: layout.screenGutter,
    right: layout.screenGutter + layout.hitMin + MAP_BUTTON_GAP,
    bottom: layout.screenGutter,
    alignItems: 'flex-start',
    gap: 8,
  },
  chips: {
    gap: 8,
  },
  hint: {
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    boxShadow: shadow[1],
  },
  hintText: {
    ...text.label,
    color: colors.textSecondary,
  },
});
