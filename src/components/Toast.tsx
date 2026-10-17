import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut } from 'react-native-reanimated';

import { colors, duration, easing, radius, shadow, space, text } from '@/theme/tokens';

/** How long a toast stays, in milliseconds. */
const VISIBLE_FOR = 3200;
const fade = Easing.bezier(...easing.out);

type Props = {
  message: string;
  /** Label of the optional action, e.g. "Annuler". */
  action?: string;
  onAction?: () => void;
  /** Called once the toast has been shown long enough, or its action was pressed. */
  onHide: () => void;
};

/** Brief ink message at the bottom of the screen, with an optional action. */
export function Toast({ message, action, onAction, onHide }: Props) {
  useEffect(() => {
    const timer = setTimeout(onHide, VISIBLE_FOR);
    return () => clearTimeout(timer);
  }, [message, onHide]);

  return (
    <Animated.View
      accessibilityRole="alert"
      entering={FadeIn.duration(duration.base).easing(fade)}
      exiting={FadeOut.duration(duration.base).easing(fade)}
      style={styles.toast}>
      <Text style={styles.message}>{message}</Text>
      {action && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            onAction?.();
            onHide();
          }}
          style={styles.action}>
          <Text style={styles.actionText}>{action}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
    paddingLeft: 14,
    paddingRight: space[3],
    borderRadius: radius.md,
    backgroundColor: colors.surfaceInverse,
    boxShadow: shadow[2],
  },
  message: {
    ...text.bodyS,
    flex: 1,
    paddingVertical: 10,
    color: colors.textInverse,
  },
  action: {
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  actionText: {
    ...text.label,
    color: colors.terracotta300,
  },
});
