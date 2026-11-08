// The design system's PlaceRow: a Place in a list, with its thumbnail, a meta line and its
// Status's dot. Rows are hairline-separated; the last of a list has no line under it.
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { IconButton } from '@/components/IconButton';
import { photoUri } from '@/journal/devicePhotoFiles';
import type { Status } from '@/journal/journal';
import { colors, duration, easing, layout, radius, space, text } from '@/theme/tokens';

type Props = {
  name: string;
  meta?: string;
  status: Status;
  /** The file of its Cover photo's thumbnail, if it has one. */
  thumbnail: string | null;
  last?: boolean;
  /** Tinted when the row is arrived at, the tint then fading. */
  highlighted?: boolean;
  /** A second, smaller action, beside the Status's dot: « Voir sur le globe », say. */
  action?: { icon: LucideIcon; label: string; onPress: () => void };
  onPress: () => void;
};

/** How long a highlighted row keeps its tint before it fades, in milliseconds. */
const HIGHLIGHT_HOLD = 1400;

/** The accent's tint under a row arrived at, fading away. */
function Highlight() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withDelay(
      HIGHLIGHT_HOLD,
      withTiming(0, { duration: duration.slow * 2, easing: Easing.bezier(...easing.out) }),
    );
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View pointerEvents="none" style={[styles.highlight, style]} />;
}

const DOT: Record<Status, object> = {
  visited: { backgroundColor: colors.stateVisited },
  wish: { backgroundColor: colors.stateWish },
  unexplored: { borderWidth: layout.borderWidth, borderColor: colors.ink3 },
};

export function PlaceRow({ name, meta, status, thumbnail, last, highlighted, action, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, last && styles.last, pressed && { backgroundColor: colors.paper2 }]}>
      {highlighted && <Highlight />}
      <View style={styles.thumbnail}>
        {thumbnail && <Image source={{ uri: photoUri(thumbnail) }} style={StyleSheet.absoluteFill} />}
      </View>
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {action && <IconButton variant="ghost" icon={action.icon} label={action.label} onPress={action.onPress} />}
      <View style={[styles.dot, DOT[status]]} />
      <ChevronRight color={colors.ink4} size={18} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
    minHeight: 56,
    paddingVertical: space[3],
    borderBottomWidth: layout.borderWidth,
    borderBottomColor: colors.borderDefault,
  },
  last: {
    borderBottomWidth: 0,
  },
  // Bleeds a little past the row's text, under it.
  highlight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: -space[3],
    right: -space[3],
    borderRadius: radius.md,
    backgroundColor: colors.accentTint,
  },
  // 44 pt square, 4 pt corners; the hatched placeholder's paper until the Place has Photos.
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.paper2,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...text.bodyStrong,
    color: colors.textPrimary,
  },
  meta: {
    ...text.bodyS,
    color: colors.textMuted,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
