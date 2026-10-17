import { useCallback, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { countries, countryGeometry, footprintOf } from '@/atlas';
import { Toast } from '@/components/Toast';
import type { Point } from '@/globe/camera';
import { Globe, type GlobeHandle } from '@/globe/Globe';
import { recenterAction } from '@/location/launch';
import { useLocation } from '@/location/LocationProvider';
import { PlaceSheet, type SheetPlace } from '@/sheet/PlaceSheet';
import { colors, layout, radius, shadow, text } from '@/theme/tokens';

type Notice = { message: string; action?: string; onAction?: () => void };

const turnOnLocation: Notice = {
  message: 'La localisation est désactivée pour Globe trotter. Activez-la dans Réglages.',
  action: 'Réglages',
  onAction: () => Linking.openSettings(),
};
const noPosition: Notice = {
  message: 'Position introuvable. Vérifiez que le service de localisation est activé dans Réglages.',
};

// The Journal arrives with #6; until then it is always empty.
const journalIsEmpty = true;

export default function GlobeScreen() {
  const { launch, position, permission, request, locate } = useLocation();
  const globe = useRef<GlobeHandle>(null);
  const sheetHeight = useSharedValue(0);
  const [screenHeight, setScreenHeight] = useState(0);
  const [selected, setSelected] = useState<SheetPlace | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const hideNotice = useCallback(() => setNotice(null), []);

  const onSelect = useCallback((country: number | null) => {
    if (country === null) return setSelected(null);
    const { lon, lat } = footprintOf(countryGeometry, country);
    setSelected({ name: countries[country].name, lon, lat });
  }, []);
  const onClose = useCallback(() => {
    globe.current?.deselect();
    setSelected(null);
  }, []);

  // Stable between renders, so the memoised globe only re-renders when the position moves.
  const recenter = useCallback(async (): Promise<Point | null> => {
    const locateOrExplain = async () => {
      const point = await locate();
      if (!point) setNotice(noPosition);
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
        setNotice(turnOnLocation);
        return null;
    }
  }, [position, permission, request, locate]);

  // The root layout only shows the routes once the launch view is known.
  if (!launch) return null;

  return (
    <View style={styles.screen} onLayout={(e) => setScreenHeight(e.nativeEvent.layout.height)}>
      <Globe
        ref={globe}
        start={launch}
        position={position}
        onRecenter={recenter}
        sheetHeight={sheetHeight}
        onSelect={onSelect}
      />
      {/* Beside the map buttons, under the sheet. */}
      <View style={styles.bottomLeft} pointerEvents="box-none">
        {notice ? (
          <Toast {...notice} onHide={hideNotice} />
        ) : (
          journalIsEmpty &&
          !selected && (
            <View style={styles.hint}>
              <Text style={styles.hintText}>Touchez un pays pour commencer</Text>
            </View>
          )
        )}
      </View>
      {screenHeight > 0 && (
        <PlaceSheet height={sheetHeight} screenHeight={screenHeight} place={selected} onClose={onClose} />
      )}
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
