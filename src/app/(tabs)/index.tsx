import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { countries, countryGeometry, footprintOf, places } from '@/atlas';
import { FilterChip } from '@/components/FilterChip';
import { STATUS_LABEL } from '@/components/StatusBadge';
import { Toast } from '@/components/Toast';
import type { Point } from '@/globe/camera';
import { Globe, type GlobeHandle } from '@/globe/Globe';
import { layerOf, type Filters } from '@/globe/layers';
import type { Journal, Mark, Status } from '@/journal/journal';
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
const layersOf = (journal: Journal, filters: Filters) =>
  places.map((place) => layerOf(journal.status(place), filters));

export default function GlobeScreen() {
  const { launch, position, permission, request, locate } = useLocation();
  const { journal, version, mark, undo } = useJournal();
  const globe = useRef<GlobeHandle>(null);
  const sheetHeight = useSharedValue(0);
  const [screenHeight, setScreenHeight] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [filters, setFilters] = useState(ALL_SHOWN);
  const [notice, setNotice] = useState<Notice | null>(null);
  const noticeKey = useRef(0);
  const notify = useCallback((next: Omit<Notice, 'key'>) => setNotice({ ...next, key: ++noticeKey.current }), []);
  const hideNotice = useCallback(() => setNotice(null), []);

  // Written from here, read by the globe on the UI thread: marking never re-renders the globe.
  const layers = useSharedValue(useMemo(() => layersOf(journal, ALL_SHOWN), [journal]));
  useEffect(() => {
    layers.value = layersOf(journal, filters);
  }, [layers, journal, version, filters]);
  const counts = journal.counts();

  const place = useMemo<SheetPlace | null>(() => {
    if (selected === null) return null;
    const { lon, lat } = footprintOf(countryGeometry, selected);
    return { name: countries[selected].name, lon, lat, status: journal.status(places[selected]) };
  }, [selected, journal, version]);

  const onClose = useCallback(() => {
    globe.current?.deselect();
    setSelected(null);
  }, []);
  const onMark = (next: Mark | null) => {
    if (selected === null) return;
    mark(places[selected], next);
    const status: Status = next ?? 'unexplored';
    notify({ message: `${countries[selected].name} · ${STATUS_LABEL[status]}`, action: 'Annuler', onAction: undo });
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
        onSelect={setSelected}
        layers={layers}
      />
      {screenHeight > 0 && (
        <PlaceSheet
          height={sheetHeight}
          screenHeight={screenHeight}
          place={place}
          onClose={onClose}
          onMark={onMark}
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
