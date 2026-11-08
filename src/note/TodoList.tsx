// The checklist of a Note: Todos checked, deleted, and reordered by dragging their grip (see
// DragList).
import { X } from 'lucide-react-native';
import type { RefObject } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Checkbox } from '@/components/Checkbox';
import { DragList } from '@/components/DragList';
import type { Todo } from '@/journal/journal';
import { colors, radius } from '@/theme/tokens';

type Props = {
  todos: readonly Todo[];
  /** The scroll view holding the list: it stays still while a Todo is dragged. */
  scroll: RefObject<unknown>;
  onCheck: (id: number, done: boolean) => void;
  /** The Todo was dropped at `to`, an index in the list. */
  onMove: (id: number, to: number) => void;
  onDelete: (id: number) => void;
};

export function TodoList({ todos, scroll, onCheck, onMove, onDelete }: Props) {
  return (
    <DragList
      items={todos}
      keyOf={(todo) => String(todo.id)}
      gripLabel={(todo) => `Déplacer « ${todo.text} »`}
      onMove={(key, to) => onMove(Number(key), to)}
      scroll={scroll}
      renderItem={(todo, grip) => (
        <View style={styles.row}>
          <Checkbox label={todo.text} checked={todo.done} onChange={(done) => onCheck(todo.id, done)} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Supprimer « ${todo.text} »`}
            onPress={() => onDelete(todo.id)}
            hitSlop={4}
            style={({ pressed }) => [styles.delete, pressed && { backgroundColor: colors.paper2 }]}>
            <X color={colors.textMuted} size={18} strokeWidth={2} />
          </Pressable>
          {grip}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  delete: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
});
