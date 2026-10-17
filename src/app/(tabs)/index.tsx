import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { countries, countryGeometry, footprintOf } from '@/atlas';
import { Globe, type GlobeHandle } from '@/globe/Globe';
import { PlaceSheet, type SheetPlace } from '@/sheet/PlaceSheet';

export default function GlobeScreen() {
  const globe = useRef<GlobeHandle>(null);
  const sheetHeight = useSharedValue(0);
  const [screenHeight, setScreenHeight] = useState(0);
  const [selected, setSelected] = useState<SheetPlace | null>(null);

  const onSelect = useCallback((country: number | null) => {
    if (country === null) return setSelected(null);
    const { lon, lat } = footprintOf(countryGeometry, country);
    setSelected({ name: countries[country].name, lon, lat });
  }, []);
  const onClose = useCallback(() => {
    globe.current?.deselect();
    setSelected(null);
  }, []);

  return (
    <View style={styles.screen} onLayout={(e) => setScreenHeight(e.nativeEvent.layout.height)}>
      <Globe ref={globe} sheetHeight={sheetHeight} onSelect={onSelect} />
      {screenHeight > 0 && (
        <PlaceSheet height={sheetHeight} screenHeight={screenHeight} place={selected} onClose={onClose} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
