import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { atlas, cityPlace, containerOf, listedCity, countries, countryGeometry, footprintOf, places, type Footprint } from '@/atlas';
import { FilterChip } from '@/components/FilterChip';
import { STATUS_LABEL } from '@/components/StatusBadge';
import { Toast } from '@/components/Toast';
import type { Point } from '@/globe/camera';
import { Globe, type GlobeHandle, type RegionLayers, type ShownRegions } from '@/globe/Globe';
import { layerOf, type Filters } from '@/globe/layers';
import { useShowOnGlobe } from '@/globe/ShowOnGlobeProvider';
import type { City, Journal, Mark, PlaceRef, Status } from '@/journal/journal';
import { useJournal } from '@/journal/JournalProvider';
import { recenterAction } from '@/location/launch';
import { useLocation } from '@/location/LocationProvider';
import { SearchBar, type Picked } from '@/search/SearchBar';
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
const regionLayersOf = (journal: Journal, filters: Filters, regions: Regions): RegionLayers => ({
  country: regions.country,
  layers: regions.list.map(({ id }) => layerOf(journal.status(regionRef(id)), filters)),
});

/** The name of a Place, for the provenance of a Status. */
const nameOf = (journal: Journal, place: PlaceRef) => {
  if (place.level === 'city') return journal.city(place.id)?.name ?? '';
  return place.level === 'region' ? (atlas.region(place.id)?.name ?? '') : (countries.find((c) => c.id === place.id)?.name ?? '');
};

/** Index in the Atlas of a Country or Island, by id. */
const indexOf = (id: string) => countries.findIndex((c) => c.id === id);

/**
 * What the globe frames for a City: a square of 0.015 globe radii, about 100 km, a city and
 * what is around it.
 */
const cityFootprint = ({ lon, lat }: City): Footprint => ({ lon, lat, width: 0.015, height: 0.015 });

/** The points of the Journal's Cities, for the globe. */
const cityPoints = (journal: Journal) => journal.cities().map(({ lon, lat }) => ({ lon, lat }));

export default function GlobeScreen() {
  const { launch, position, permission, request, locate } = useLocation();
  const { journal, version, mark, undo } = useJournal();
  const insets = useSafeAreaInsets();
  const globe = useRef<GlobeHandle>(null);
  const sheetHeight = useSharedValue(0);
  const [screenHeight, setScreenHeight] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  /** The Regions of the selected Country, once loaded. */
  const [regions, setRegions] = useState<Regions | null>(null);
  const shownList = useRef<Regions | null>(null);
  useEffect(() => {
    shownList.current = regions;
  }, [regions]);
  /** In the selected Country, the Region or the City the sheet shows instead of it. */
  const [region, setRegion] = useState<string | null>(null);
  const [city, setCity] = useState<City | null>(null);
  /** What a search or the list « Villes » has asked the globe to select, until it tells it did. */
  const asked = useRef<{ country: number; region?: string; city?: City } | null>(null);
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
  const cities = useSharedValue(useMemo(() => cityPoints(journal), [journal]));
  useEffect(() => {
    cities.value = cityPoints(journal);
  }, [cities, journal, version]);
  const counts = journal.counts();
  // The selected Country's Regions, loaded and decoded on the JS thread while the globe flies
  // on the UI thread, then handed to it with their colours.
  const shownRegions = useSharedValue<ShownRegions | null>(null);
  const regionLayers = useSharedValue<RegionLayers | null>(null);
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
    regionLayers.value = regions ? regionLayersOf(journal, filters, regions) : null;
  }, [regionLayers, journal, version, filters, regions]);

  /** The Place the sheet shows: the selected City or Region, or else the selected Country or Island. */
  const sheetRef = useMemo<PlaceRef | City | null>(() => {
    if (selected === null) return null;
    return city ?? (region !== null ? regionRef(region) : places[selected]);
  }, [selected, region, city]);

  const place = useMemo<SheetPlace | null>(() => {
    if (selected === null || !sheetRef) return null;
    const own = sheetRef.level === 'region' ? atlas.region(sheetRef.id) : city;
    const { lon, lat } = own ?? footprintOf(countryGeometry, selected);
    return {
      name: own?.name ?? countries[selected].name,
      overline: own ? countries[selected].name : undefined,
      lon,
      lat,
      status: journal.status(sheetRef),
      via: journal.via(sheetRef).map((p) => nameOf(journal, p)),
      canRemove: journal.canRemoveMark(sheetRef),
      feminine: sheetRef.level === 'region' || sheetRef.level === 'city',
      note: journal.place(sheetRef)?.note ?? '',
      cities: journal
        .citiesIn(sheetRef)
        .map(({ id, name }) => ({ id, name, status: journal.status({ level: 'city', id }) })),
    };
  }, [selected, sheetRef, city, journal, version]);

  /** Flies to a City, framed with what is around it, and opens its sheet. */
  const selectCity = useCallback((target: City) => {
    const country = indexOf(target.islandId ?? target.countryId);
    if (country < 0) return;
    asked.current = { country, city: target };
    globe.current?.select(country, cityFootprint(target));
  }, []);
  /** A City by id: the Journal's, or else the list's (loaded by the search that found it). */
  const findCity = useCallback((id: string) => journal.city(id) ?? listedCity(id), [journal]);

  // The location link of a Note, say: fly to its Place and open its sheet.
  const { pending, shown } = useShowOnGlobe();
  useEffect(() => {
    if (!pending) return;
    if (pending.level === 'city') {
      const target = findCity(pending.id);
      if (target) selectCity(target);
    } else {
      // A Region is shown by its Country.
      const target = pending.level === 'region' ? containerOf(pending) : pending;
      const index = places.findIndex((p) => p.level === target?.level && p.id === target.id);
      if (index >= 0) globe.current?.select(index);
    }
    shown();
  }, [pending, shown, findCity, selectCity]);

  // A result of « Rechercher un lieu »: the globe flies there and selects it.
  const onPick = (picked: Picked) => {
    switch (picked.level) {
      case 'country':
      case 'island':
        globe.current?.select(indexOf(picked.place.id));
        return;
      case 'region': {
        const country = indexOf(picked.place.countryId);
        asked.current = { country, region: picked.place.id };
        globe.current?.select(country);
        return;
      }
      case 'city':
        selectCity(journal.city(picked.place.id) ?? cityPlace(picked.place));
    }
  };
  const onOpenCity = (id: string) => {
    const target = journal.city(id);
    if (target) selectCity(target);
  };

  const onOpenNote = () => {
    if (!sheetRef) return;
    router.push({ pathname: '/note/[level]/[id]', params: { level: sheetRef.level, id: sheetRef.id } });
  };

  // A Country, an Island or the sea: any Region or City selected goes, unless it was asked for.
  const onSelect = useCallback((country: number | null) => {
    const wanted = asked.current?.country === country ? asked.current : null;
    asked.current = null;
    setSelected(country);
    setRegion(wanted?.region ?? null);
    setCity(wanted?.city ?? null);
  }, []);
  // Stable, like onSelect: the Regions are read when tapped.
  const onSelectRegion = useCallback((index: number) => {
    const list = shownList.current;
    if (!list) return;
    setCity(null);
    setRegion(list.list[index].id);
  }, []);
  const onClose = useCallback(() => {
    globe.current?.deselect();
    onSelect(null);
  }, [onSelect]);
  const onMark = (next: Mark | null) => {
    if (!sheetRef || !place) return;
    mark(sheetRef, next);
    // Its Status after the change: a Mark taken back can leave one inherited.
    const status: Status = journal.status(sheetRef);
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
        onSelectRegion={onSelectRegion}
        cities={cities}
      />
      {screenHeight > 0 && (
        <PlaceSheet
          height={sheetHeight}
          screenHeight={screenHeight}
          place={place}
          onClose={onClose}
          onMark={onMark}
          onOpenNote={onOpenNote}
          onOpenCity={onOpenCity}
        />
      )}
      {/* Over the sheet, so that its results show over it too. */}
      <View style={[styles.search, { top: insets.top + SEARCH_GAP }]} pointerEvents="box-none">
        <SearchBar onPick={onPick} />
      </View>
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
/** Between the status bar and the search pill, in points. */
const SEARCH_GAP = 4;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  search: {
    position: 'absolute',
    left: layout.screenGutter,
    right: layout.screenGutter,
  },
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
