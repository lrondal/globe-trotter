import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, duration, easing, layout, radius, shadow, space, text } from '@/theme/tokens';

type Props = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

const TRACK_WIDTH = 44;
const TRACK_HEIGHT = 26;
const KNOB = 20;
const INSET = 3;
const TRAVEL = TRACK_WIDTH - KNOB - 2 * INSET;

const timing = { duration: duration.base, easing: Easing.bezier(...easing.out) };

/** Ink toggle with its label on the left, for a settings row: the whole row toggles it. */
export function Switch({ label, checked, onChange }: Props) {
  const on = useSharedValue(checked ? 1 : 0);
  useEffect(() => {
    on.value = withTiming(checked ? 1 : 0, timing);
  }, [on, checked]);
  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [colors.paper3, colors.ink1]),
  }));
  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: on.value * TRAVEL }] }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.knob, knobStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[4],
    minHeight: layout.hitMin,
  },
  label: {
    ...text.body,
    flex: 1,
    color: colors.textPrimary,
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: radius.pill,
    padding: INSET,
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: colors.paper0,
    boxShadow: shadow[1],
  },
});
