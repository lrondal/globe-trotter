// The checklist of a Note: Todos checked, deleted, and reordered by dragging their grip.
// Each row is placed from `order`, the ids in the list's order, which a drag rewrites on the
// UI thread as the row passes the others; they slide aside. The Journal is only told on the
// drop, and its new order is the one already on screen, so nothing jumps when React re-renders.
import { GripVertical, X } from 'lucide-react-native';
import { useEffect, type RefObject } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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

import { Checkbox } from '@/components/Checkbox';
import type { Todo } from '@/journal/journal';
import { colors, duration, easing, layout, radius, shadow } from '@/theme/tokens';

import { dropIndex, moved } from './reorder';

/** A row's height until it is measured: one line of text. */
const ROW = layout.hitMin;
const slide = { duration: duration.base, easing: Easing.bezier(...easing.out) };

type Actions = {
  onCheck: (id: number, done: boolean) => void;
  /** The Todo was dropped at `to`, an index in the list. */
  onMove: (id: number, to: number) => void;
  onDelete: (id: number) => void;
};

type Props = Actions & {
  todos: readonly Todo[];
  /** The scroll view holding the list: it stays still while a Todo is dragged. */
  scroll: RefObject<unknown>;
};

/** What every row reads and writes on the UI thread. */
type Shared = {
  order: SharedValue<number[]>;
  /** Each row's measured height, by Todo id. */
  heights: SharedValue<Record<number, number>>;
  /** The id of the Todo under the finger, or null. */
  dragged: SharedValue<number | null>;
};

export function TodoList({ todos, scroll, ...actions }: Props) {
  const order = useSharedValue(todos.map((todo) => todo.id));
  const heights = useSharedValue<Record<number, number>>({});
  const dragged = useSharedValue<number | null>(null);
  useEffect(() => {
    order.value = todos.map((todo) => todo.id);
  }, [order, todos]);

  const size = useAnimatedStyle(() => {
    let total = 0;
    for (const id of order.value) total += heights.value[id] ?? ROW;
    return { height: total };
  });

  const shared = { order, heights, dragged };
  return (
    <Animated.View style={size}>
      {todos.map((todo, index) => (
        <TodoRow
          key={todo.id}
          todo={todo}
          index={index}
          count={todos.length}
          shared={shared}
          scroll={scroll}
          {...actions}
        />
      ))}
    </Animated.View>
  );
}

type RowProps = Actions & {
  todo: Todo;
  index: number;
  count: number;
  shared: Shared;
  scroll: RefObject<unknown>;
};

function TodoRow({ todo, index, count, shared, scroll, onCheck, onMove, onDelete }: RowProps) {
  const { id } = todo;
  const { order, heights, dragged } = shared;
  const top = useSharedValue(0);
  /** Where the row was when the finger took it: its index, and its top edge. */
  const start = useSharedValue({ index: 0, top: 0 });

  const heightOf = (other: number) => {
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
      <Checkbox label={todo.text} checked={todo.done} onChange={(done) => onCheck(id, done)} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Supprimer « ${todo.text} »`}
        onPress={() => onDelete(id)}
        hitSlop={4}
        style={({ pressed }) => [styles.delete, pressed && { backgroundColor: colors.paper2 }]}>
        <X color={colors.textMuted} size={18} strokeWidth={2} />
      </Pressable>
      <GestureDetector gesture={drag}>
        <View
          style={styles.grip}
          accessible
          accessibilityLabel={`Déplacer « ${todo.text} »`}
          accessibilityActions={[
            ...(index > 0 ? [{ name: 'up', label: 'Monter' }] : []),
            ...(index < count - 1 ? [{ name: 'down', label: 'Descendre' }] : []),
          ]}
          onAccessibilityAction={(e) => onMove(id, e.nativeEvent.actionName === 'up' ? index - 1 : index + 1)}>
          <GripVertical color={colors.textMuted} size={20} strokeWidth={2} />
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
  },
  delete: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  grip: {
    width: layout.hitMin,
    height: layout.hitMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
