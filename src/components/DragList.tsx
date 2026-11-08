// A list reordered by dragging its rows' grip: the Todos of a Note, the stops of an Itinerary,
// the Plans of the Wishlist. Each row is placed from `order`, the keys in the list's order,
// which a drag rewrites on the UI thread as the row passes the others; they slide aside. The
// owner is only told on the drop, and its new order is the one already on screen, so nothing
// jumps when React re-renders.
import { GripVertical } from 'lucide-react-native';
import { useEffect, type ReactElement, type ReactNode, type RefObject } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { dropIndex, moved } from '@/note/reorder';
import { colors, duration, easing, layout, radius, shadow } from '@/theme/tokens';

/** A row's height until it is measured: one line of text. */
const ROW = layout.hitMin;
const slide = { duration: duration.base, easing: Easing.bezier(...easing.out) };

type Props<T> = {
  items: readonly T[];
  keyOf: (item: T) => string;
  /** What the grip of a row is called to a screen reader: « Déplacer « Visa » », say. */
  gripLabel: (item: T) => string;
  /** A row, given its grip to place in it. */
  renderItem: (item: T, grip: ReactElement, index: number) => ReactNode;
  /** The row `key` was dropped at `to`, an index in the list. */
  onMove: (key: string, to: number) => void;
  /** The scroll view holding the list: it stays still while a row is dragged. */
  scroll: RefObject<unknown>;
};

/** What every row reads and writes on the UI thread. */
type Shared = {
  order: SharedValue<string[]>;
  /** Each row's measured height, by key. */
  heights: SharedValue<Record<string, number>>;
  /** The key of the row under the finger, or null. */
  dragged: SharedValue<string | null>;
};

export function DragList<T>({ items, keyOf, gripLabel, renderItem, onMove, scroll }: Props<T>) {
  const keys = items.map(keyOf);
  const order = useSharedValue(keys);
  const heights = useSharedValue<Record<string, number>>({});
  const dragged = useSharedValue<string | null>(null);
  const joined = keys.join('\n');
  useEffect(() => {
    order.value = joined === '' ? [] : joined.split('\n');
  }, [order, joined]);

  const size = useAnimatedStyle(() => {
    let total = 0;
    for (const key of order.value) total += heights.value[key] ?? ROW;
    return { height: total };
  });

  const shared = { order, heights, dragged };
  return (
    <Animated.View style={size}>
      {items.map((item, index) => (
        <DragRow
          key={keys[index]}
          id={keys[index]}
          index={index}
          count={items.length}
          label={gripLabel(item)}
          shared={shared}
          scroll={scroll}
          onMove={onMove}
          render={(grip) => renderItem(item, grip, index)}
        />
      ))}
    </Animated.View>
  );
}

type RowProps = {
  id: string;
  index: number;
  count: number;
  label: string;
  shared: Shared;
  scroll: RefObject<unknown>;
  onMove: (key: string, to: number) => void;
  render: (grip: ReactElement) => ReactNode;
};

function DragRow({ id, index, count, label, shared, scroll, onMove, render }: RowProps) {
  const { order, heights, dragged } = shared;
  const top = useSharedValue(0);
  /** Where the row was when the finger took it: its index, and its top edge. */
  const start = useSharedValue({ index: 0, top: 0 });

  const heightOf = (other: string) => {
    'worklet';
    return heights.value[other] ?? ROW;
  };
  /** The row's place in the list, from the top; a row not in `order` yet goes last. */
  const slotOf = () => {
    'worklet';
    let y = 0;
    for (const other of order.value) {
      if (other === id) return y;
      y += heightOf(other);
    }
    return y;
  };

  // Rows slide to a new place during and right after a drag; otherwise, e.g. as a row opens
  // or is measured, they go straight there.
  useAnimatedReaction(
    () => (dragged.value === id ? null : slotOf()),
    (slot, previous) => {
      if (slot === null || slot === previous) return;
      const sliding = previous !== undefined && (dragged.value !== null || previous === null);
      top.value = sliding ? withTiming(slot, slide) : slot;
    },
  );

  const drag = Gesture.Pan()
    .minDistance(2)
    .blocksExternalGesture(scroll as never)
    .onStart(() => {
      start.value = { index: order.value.indexOf(id), top: top.value };
      dragged.value = id;
    })
    .onChange((e) => {
      const list = order.value;
      let total = 0;
      for (const other of list) total += heightOf(other);
      const y = Math.max(0, Math.min(total - heightOf(id), start.value.top + e.translationY));
      top.value = y;
      const from = list.indexOf(id);
      const to = dropIndex(
        list.map((other) => heightOf(other)),
        from,
        y,
      );
      if (to !== from) order.value = moved(list, from, to);
    })
    .onFinalize(() => {
      if (dragged.value !== id) return;
      dragged.value = null;
      const to = order.value.indexOf(id);
      if (to !== start.value.index) scheduleOnRN(onMove, id, to);
    });

  const place = useAnimatedStyle(() => {
    const lifted = dragged.value === id;
    return {
      top: top.value,
      zIndex: lifted ? 1 : 0,
      backgroundColor: lifted ? colors.surfaceRaised : 'transparent',
      boxShadow: lifted ? shadow[2] : 'none',
    };
  });

  const grip = (
    <GestureDetector gesture={drag}>
      <View
        style={styles.grip}
        accessible
        accessibilityLabel={label}
        accessibilityActions={[
          ...(index > 0 ? [{ name: 'up', label: 'Monter' }] : []),
          ...(index < count - 1 ? [{ name: 'down', label: 'Descendre' }] : []),
        ]}
        onAccessibilityAction={(e) => onMove(id, e.nativeEvent.actionName === 'up' ? index - 1 : index + 1)}>
        <GripVertical color={colors.textMuted} size={20} strokeWidth={2} />
      </View>
    </GestureDetector>
  );

  return (
    <Animated.View
      style={[styles.row, place]}
      onLayout={(e) => {
        const height = e.nativeEvent.layout.height;
        heights.modify((all) => {
          'worklet';
          all[id] = height;
          return all;
        });
      }}>
      {render(grip)}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: radius.md,
  },
  grip: {
    width: layout.hitMin,
    height: layout.hitMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
