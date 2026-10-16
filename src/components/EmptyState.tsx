import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, space, text } from '@/theme/tokens';

/** States the fact, with an optional action underneath. */
export function EmptyState({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: space[5],
    paddingTop: space[7],
  },
  message: {
    ...text.body,
    color: colors.textMuted,
  },
});
