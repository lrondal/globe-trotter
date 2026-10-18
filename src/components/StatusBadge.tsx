import { StyleSheet, Text, View } from 'react-native';

import type { Status } from '@/journal/journal';
import { colors, layout, radius, text } from '@/theme/tokens';

/** The French name of each Status, as the UI shows it. */
export const STATUS_LABEL: Record<Status, string> = {
  visited: 'Visité',
  wish: 'À visiter',
  unexplored: 'Non exploré',
};

const LOOKS: Record<Status, { bg: string; fg: string; border: string }> = {
  visited: { bg: colors.stateVisited, fg: colors.textOnAccent, border: 'transparent' },
  wish: { bg: colors.stateWish, fg: colors.stateWishInk, border: 'transparent' },
  unexplored: { bg: 'transparent', fg: colors.textMuted, border: colors.borderStrong },
};

/** A Place's Status, as a small label in its colour. */
export function StatusBadge({ status }: { status: Status }) {
  const look = LOOKS[status];
  return (
    <View style={[styles.badge, { backgroundColor: look.bg, borderColor: look.border }]}>
      <Text style={[styles.label, { color: look.fg }]}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    height: 24,
    justifyContent: 'center',
    paddingHorizontal: 9,
    borderWidth: layout.borderWidth,
    borderRadius: radius.sm,
  },
  label: {
    ...text.label,
  },
});
