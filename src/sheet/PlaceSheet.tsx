// The Place sheet: a paper sheet over the bottom of the globe, dragged between peek, half and
// full height. Its height is a shared value the Globe writes too, so a tap on a Country opens
// it from the UI thread, before React has rendered its content.
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { colors, duration, easing, layout, radius, shadow, space, text } from '@/theme/tokens';

import { formatCoordinates } from './coordinates';
import { detentHeight, restingDetent } from './detents';

export type SheetPlace = { name: string; lon: number; lat: number };

type Props = {
  /** Points of sheet showing above the bottom of the screen; 0 when closed. */
  height: SharedValue<number>;
  screenHeight: number;
  /** The Place shown; null while the sheet closes. */
  place: SheetPlace | null;
  onClose: () => void;
};

export const sheetTiming = { duration: duration.slow, easing: Easing.bezier(...easing.out) };

export function PlaceSheet({ height, screenHeight, place, onClose }: Props) {
  // The last Place stays on the sheet while it slides away.
  const [shown, setShown] = useState(place);
  if (place && place !== shown) setShown(place);

  const full = detentHeight('full', screenHeight);
  const drag = Gesture.Pan()
    .onBegin(() => {
      cancelAnimation(height);
    })
    .onChange((e) => {
      height.value = Math.max(0, Math.min(full, height.value - e.changeY));
    })
    .onEnd((e) => {
      const detent = restingDetent(height.value, -e.velocityY, screenHeight);
      if (detent) height.value = withTiming(detentHeight(detent, screenHeight), sheetTiming);
      else scheduleOnRN(onClose);
    });

  const slide = useAnimatedStyle(() => ({
    // Closed, it also hides its shadow below the screen.
    transform: [{ translateY: full - height.value + (height.value <= 0 ? 48 : 0) }],
  }));

  return (
    <Animated.View style={[styles.sheet, { height: full }, slide]}>
      <GestureDetector gesture={drag}>
        <View style={styles.grip}>
          <View style={styles.handle} />
          {shown && (
            <View style={styles.header}>
              <View style={styles.titles}>
                <Text style={styles.title} numberOfLines={2}>
                  {shown.name}
                </Text>
                <Text style={styles.meta}>{formatCoordinates(shown.lon, shown.lat)}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fermer"
                onPress={onClose}
                hitSlop={4}
                style={({ pressed }) => [styles.close, pressed && { backgroundColor: colors.paper2 }]}>
                <X color={colors.textPrimary} size={18} strokeWidth={2} />
              </Pressable>
            </View>
          )}
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    boxShadow: shadow.sheet,
  },
  grip: {
    paddingBottom: space[4],
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginTop: space[3],
    marginBottom: space[2],
    backgroundColor: colors.paper4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[4],
    paddingHorizontal: layout.screenGutter,
    paddingTop: space[2],
  },
  titles: {
    flex: 1,
    gap: space[3],
  },
  title: {
    ...text.displayL,
    color: colors.textPrimary,
    letterSpacing: -0.34,
  },
  meta: {
    ...text.caption,
    color: colors.textMuted,
  },
  close: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: layout.borderWidth,
    borderColor: colors.borderStrong,
  },
});
