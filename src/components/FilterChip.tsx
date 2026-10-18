import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { Status } from '@/journal/journal';
import { colors, layout, pressFeedback, radius, shadow, text } from '@/theme/tokens';

import { STATUS_LABEL } from './StatusBadge';

const DOT: Record<Status, string> = {
  visited: colors.stateVisited,
  wish: colors.stateWish,
  unexplored: colors.stateUnexplored,
};

const { scale: pressedScale, duration, easing } = pressFeedback.button;
const timing = { duration, easing: Easing.bezier(...easing) };

type Props = {
  status: Status;
  count: number;
  /** Whether the globe shows this Status's colour layer. */
  selected: boolean;
  onPress: () => void;
};

/** Pill that shows or hides one Status's colour layer on the globe; doubles as its legend. */
export function FilterChip({ status, count, selected, onPress }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const label = STATUS_LABEL[status];

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="togglebutton"
        accessibilityLabel={`${label}, ${count}`}
        accessibilityState={{ checked: selected }}
        onPress={onPress}
        onPressIn={() => (scale.value = withTiming(pressedScale, timing))}
        onPressOut={() => (scale.value = withTiming(1, timing))}
        style={[styles.chip, selected ? styles.selected : styles.deselected]}>
        <View
          style={[
            styles.dot,
            {
              backgroundColor: selected ? DOT[status] : 'transparent',
              borderColor: selected && status !== 'unexplored' ? DOT[status] : colors.ink3,
            },
          ]}
        />
        <Text style={[styles.label, { color: selected ? colors.textPrimary : colors.textMuted }]}>{label}</Text>
        <Text style={styles.count}>{count}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    height: 36,
    paddingHorizontal: 12,
    borderWidth: layout.borderWidth,
    borderRadius: radius.pill,
  },
  selected: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.borderStrong,
    boxShadow: shadow[1],
  },
  deselected: {
    backgroundColor: 'transparent',
    borderColor: colors.borderDefault,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  label: {
    ...text.label,
  },
  count: {
    ...text.label,
    fontFamily: text.bodyS.fontFamily,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
});
