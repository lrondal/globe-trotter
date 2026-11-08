import { router, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  anchorOf,
  atlas,
  cityPlace,
  listedCity,
  countries,
  countryGeometry,
  footprintOf,
  placeIndex as indexOf,
  places,
  type Footprint,
} from '@/atlas';
import { Button } from '@/components/Button';
import { FilterChip } from '@/components/FilterChip';
import { NameDialog } from '@/components/NameDialog';
import { STATUS_LABEL } from '@/components/StatusBadge';
import { Toast } from '@/components/Toast';
import type { Point } from '@/globe/camera';
import { Globe, type CityDot, type GlobeHandle, type RegionLayers, type ShownRegions } from '@/globe/Globe';
import { layerOf, type Filters } from '@/globe/layers';
import { useShowOnGlobe } from '@/globe/ShowOnGlobeProvider';
import type { CityPlace } from '@/globe/thumbnails';
import { useGlobeThumbnails, type RegionAnchors } from '@/globe/useGlobeThumbnails';
import { usePreferences } from '@/profile/PreferencesProvider';
import type { City, Journal, Mark, PlaceRef, Status } from '@/journal/journal';
import { useJournal } from '@/journal/JournalProvider';
import { placeName } from '@/journal/placeName';
import { recenterAction } from '@/location/launch';
import { useLocation } from '@/location/LocationProvider';
import { SearchBar, type Picked } from '@/search/SearchBar';
import { detentHeight } from '@/sheet/detents';
import { ERASED, erasableOf } from '@/sheet/erase';
import { openPhoto } from '@/photos/openPhoto';
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
const atSea = { message: 'Impossible de placer une ville en mer. Choisissez un point sur la terre.' };

/** What the name dialog is open for: a Custom City to create at a point, or one to rename. */
type Naming = { point: Point } | { city: City };

/** The name dialog's wording, and the name it opens with. */
const dialogFor = (naming: Naming | null) =>
  naming && 'city' in naming
    ? { title: 'Renommer la ville', initial: naming.city.name, confirm: 'Renommer' }
    : { title: 'Nouvelle ville', initial: '', confirm: 'Créer' };

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


/** The heading of the Photos of the Places inside a Place, in its sheet. */
const INSIDE_LABEL: Record<PlaceRef['level'], string> = {
  country: 'Dans ce pays',
  island: 'Dans cette île',
  region: 'Dans cette région',
  city: '',
};


/**
 * What the globe frames for a City: a square of 0.015 globe radii, about 100 km, a city and
 * what is around it.
 */
const cityFootprint = ({ lon, lat }: City): Footprint => ({ lon, lat, width: 0.015, height: 0.015 });

/**
 * Where a City is, by index, as the globe selects it: in its Island, or its Country; in its
 * Region, by its index in the Country's, or -1 for none, as on an Island.
 */
const placeOfCity = (city: City): CityPlace => {
  const country = indexOf(city.islandId ?? city.countryId);
  const region = city.regionId && !city.islandId ? atlas.regionsOf(city.countryId).findIndex((r) => r.id === city.regionId) : -1;
  return { country, region };
};

/** The Journal's Cities, for the globe. */
const cityPoints = (journal: Journal): CityDot[] =>
  journal.cities().map((city) => ({ id: city.id, lon: city.lon, lat: city.lat, ...placeOfCity(city) }));

export default function GlobeScreen() {
  const { launch, position, permission, request, locate } = useLocation();
  const { journal, version, mark, undo, setVisitDate, createCity, renameCity, moveCity, clear, deleteCity } =
    useJournal();
  const insets = useSafeAreaInsets();
  const globe = useRef<GlobeHandle>(null);
  const sheetHeight = useSharedValue(0);
  const [screenHeight, setScreenHeight] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  /** The Regions of the selected Country, once loaded. */
  const [regions, setRegions] = useState<Regions | null>(null);
  /** Where their Photo thumbnails sit. */
  const [regionAnchors, setRegionAnchors] = useState<RegionAnchors | null>(null);
  const shownList = useRef<Regions | null>(null);
  useEffect(() => {
    shownList.current = regions;
  }, [regions]);
  /** In the selected Country, the Region or the City the sheet shows instead of it. */
  const [region, setRegion] = useState<string | null>(null);
  const [city, setCity] = useState<City | null>(null);
  /** What a search or the list « Villes » has asked the globe to select, until it tells it did. */
  const asked = useRef<{ country: number; region?: string; city?: City } | null>(null);
  const [naming, setNaming] = useState<Naming | null>(null);
  /** The Custom City « Déplacer » was pressed on: the next long press moves it there. */
  const [moving, setMoving] = useState<City | null>(null);
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
  const { photosOnGlobe, autoRotate } = usePreferences();
  // Out of sight, under another tab or screen, the globe does not turn.
  const focused = useIsFocused();
  const thumbnails = useGlobeThumbnails(journal, version, regionAnchors, photosOnGlobe);
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
      setRegionAnchors({
        country: selected,
        anchors: loaded.regions.map(({ id }, r) => ({ id, ...anchorOf(loaded.geometry, r) })),
      });
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
    // The Journal's copy of the City, which a rename changes.
    const own = sheetRef.level === 'region' ? atlas.region(sheetRef.id) : city && (journal.city(city.id) ?? city);
    const { lon, lat } = own ?? footprintOf(countryGeometry, selected);
    return {
      ref: sheetRef,
      country: selected,
      name: own?.name ?? countries[selected].name,
      overline: own ? countries[selected].name : undefined,
      lon,
      lat,
      status: journal.status(sheetRef),
      via: journal.via(sheetRef).map((p) => placeName(journal, p)),
      visitDates: journal.visitDates(sheetRef),
      ownVisitDate: journal.place(sheetRef)?.visitDate ?? null,
      canRemove: journal.canRemoveMark(sheetRef),
      feminine: sheetRef.level === 'region' || sheetRef.level === 'city',
      note: journal.place(sheetRef)?.note ?? '',
      cities: journal.citiesIn(sheetRef).map(({ id, name }) => ({
        id,
        name,
        status: journal.status({ level: 'city', id }),
        thumbnail: journal.coverPhoto({ level: 'city', id })?.thumbnail ?? null,
      })),
      cover: journal.coverPhoto(sheetRef),
      photos: journal.photos(sheetRef),
      photosInside: journal.photosInside(sheetRef),
      insideLabel: INSIDE_LABEL[sheetRef.level],
      custom: journal.city(sheetRef.id)?.custom === true,
      erasable: erasableOf(journal, sheetRef),
    };
  }, [selected, sheetRef, city, journal, version]);

  /** Flies to a City, framed with what is around it, and opens its sheet; its Region is selected with it. */
  const selectCity = useCallback((target: City) => {
    // Its Region, selected with it.
    const { country, region } = placeOfCity(target);
    if (country < 0) return;
    asked.current = { country, city: target, region: region >= 0 ? target.regionId! : undefined };
    globe.current?.selectCity(country, cityFootprint(target), region);
  }, []);
  /** Flies to a Region, framed on its own outline, and opens its sheet. */
  const selectRegion = useCallback((id: string) => {
    const target = atlas.region(id);
    if (!target) return;
    const country = indexOf(target.countryId);
    const index = atlas.regionsOf(target.countryId).findIndex((r) => r.id === id);
    if (country < 0 || index < 0) return;
    asked.current = { country, region: id };
    globe.current?.selectRegion(country, index);
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
    } else if (pending.level === 'region') {
      selectRegion(pending.id);
    } else {
      const index = places.findIndex((p) => p.level === pending.level && p.id === pending.id);
      if (index >= 0) globe.current?.select(index);
    }
    shown();
  }, [pending, shown, findCity, selectCity, selectRegion]);

  // A result of « Rechercher un lieu »: the globe flies there and selects it.
  const onPick = (picked: Picked) => {
    switch (picked.level) {
      case 'country':
      case 'island':
        globe.current?.select(indexOf(picked.place.id));
        return;
      case 'region':
        selectRegion(picked.place.id);
        return;
      case 'city':
        selectCity(journal.city(picked.place.id) ?? cityPlace(picked.place));
    }
  };
  /** A City of the Journal: from the list « Villes », or its dot or thumbnail tapped on the globe. */
  const onOpenCity = useCallback(
    (id: string) => {
      const target = journal.city(id);
      if (target) selectCity(target);
    },
    [journal, selectCity],
  );

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

  // A long press on land asks for the name of a Custom City there; at sea, nothing happens.
  // While a Custom City is being moved, it moves it there instead.
  const longPressed = async (point: Point) => {
    if (moving) {
      if (!(await moveCity(moving.id, point))) {
        notify(atSea);
        return;
      }
      setMoving(null);
      const moved = journal.city(moving.id);
      if (moved) selectCity(moved);
      return;
    }
    // Asked before the name, so a long press at sea opens nothing.
    if (await atlas.locate(point)) setNaming({ point });
  };
  const latestLongPress = useRef(longPressed);
  useEffect(() => {
    latestLongPress.current = longPressed;
  });
  // Stable, like onSelect, so a change in the Journal never re-renders the memoised globe.
  const onLongPress = useCallback((point: Point) => latestLongPress.current(point), []);
  const onName = async (name: string) => {
    if (!naming) return;
    setNaming(null);
    if ('city' in naming) {
      renameCity(naming.city.id, name);
      return;
    }
    const created = await createCity(name, naming.point);
    if (created) selectCity(created);
  };
  // Not undoable: the toast offers no « Annuler ». A Clear leaves its Place on the sheet; a City
  // Deleted is gone, and the globe goes back to its Region, or else its Island or Country.
  const onErase = () => {
    if (!sheetRef || !place) return;
    if (sheetRef.level === 'city') {
      const gone = journal.city(sheetRef.id);
      if (!gone) return;
      deleteCity(gone.id);
      const { country } = placeOfCity(gone);
      if (country < 0) onClose();
      else if (gone.regionId && !gone.islandId) selectRegion(gone.regionId);
      else globe.current?.select(country);
    } else clear(sheetRef);
    notify({ message: `${place.name} · ${ERASED[sheetRef.level]}` });
  };
  const onMove = () => {
    if (!city) return;
    setMoving(city);
    onClose();
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
        onSelectCity={onOpenCity}
        thumbnails={thumbnails}
        onLongPress={onLongPress}
        autoRotate={autoRotate && focused}
      />
      {screenHeight > 0 && (
        <PlaceSheet
          height={sheetHeight}
          screenHeight={screenHeight}
          place={place}
          onClose={onClose}
          onBack={() => globe.current?.backToCountry()}
          onMark={onMark}
          onVisitDate={(visitDate) => sheetRef && setVisitDate(sheetRef, visitDate)}
          onOpenNote={onOpenNote}
          onOpenCity={onOpenCity}
          onOpenPhoto={(photo) => sheetRef && openPhoto(sheetRef, photo)}
          onRename={() => city && setNaming({ city: journal.city(city.id) ?? city })}
          onMove={onMove}
          onErase={onErase}
        />
      )}
      {/* Over the sheet, so that its results show over it too. */}
      <View style={[styles.search, { top: insets.top + SEARCH_GAP }]} pointerEvents="box-none">
        <SearchBar onPick={onPick} />
      </View>
      {/* Beside the map buttons; above the sheet, so the toast of a Mark shows over it. */}
      <Animated.View style={[styles.bottomLeft, bottomLeftStyle]} pointerEvents="box-none">
        {moving && (
          <View style={styles.moving}>
            <Text style={styles.hintText}>Appui long là où placer {moving.name}</Text>
            <Button variant="ghost" size="sm" onPress={() => setMoving(null)}>
              Annuler
            </Button>
          </View>
        )}
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
          selected === null &&
          !moving && (
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
      <NameDialog
        open={naming !== null}
        {...dialogFor(naming)}
        onConfirm={onName}
        onCancel={() => setNaming(null)}
      />
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
  moving: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    paddingLeft: 14,
    paddingRight: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    boxShadow: shadow[1],
  },
  hintText: {
    ...text.label,
    color: colors.textSecondary,
  },
});
