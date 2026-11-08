// The design system's PlaceRow: a Place in a list, with its thumbnail, a meta line and its
// Status's dot. Rows are hairline-separated; the last of a list has no line under it.
import { ChevronRight } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { photoUri } from '@/journal/devicePhotoFiles';
import type { Status } from '@/journal/journal';
import { colors, layout, radius, space, text } from '@/theme/tokens';

type Props = {
  name: string;
  meta?: string;
  status: Status;
  /** The file of its Cover photo's thumbnail, if it has one. */
  thumbnail: string | null;
  last?: boolean;
  onPress: () => void;
};

const DOT: Record<Status, object> = {
  visited: { backgroundColor: colors.stateVisited },
  wish: { backgroundColor: colors.stateWish },
  unexplored: { borderWidth: layout.borderWidth, borderColor: colors.ink3 },
};

export function PlaceRow({ name, meta, status, thumbnail, last, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, last && styles.last, pressed && { backgroundColor: colors.paper2 }]}>
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
