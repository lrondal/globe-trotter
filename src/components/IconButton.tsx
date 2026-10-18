import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors, layout, pressFeedback, radius, shadow } from '@/theme/tokens';

type Props = {
  icon: LucideIcon;
  /** Spoken by VoiceOver: the button has no visible text. */
  label: string;
  onPress?: () => void;
  /** Held down instead of pressed: called once the hold is recognised, instead of onPress. */
  onLongPress?: () => void;
  /** The finger lifted, after a press or a hold. */
  onPressOut?: () => void;
  /** Raised floats over the globe; ghost sits on a page, e.g. a screen's top bar. */
  variant?: 'raised' | 'ghost';
};

/** How long a finger must stay down for a press to become a hold, in milliseconds. */
const HOLD_DELAY = 300;

const { scale: pressedScale, duration, easing } = pressFeedback.iconButton;
const timing = { duration, easing: Easing.bezier(...easing) };

/** Icon button: round and raised for controls floating over the globe, or ghost. */
export function IconButton({ icon: Icon, label, onPress, onLongPress, onPressOut, variant = 'raised' }: Props) {
  const rest = variant === 'raised' ? colors.surfaceRaised : 'transparent';
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={HOLD_DELAY}
        onPressIn={() => (scale.value = withTiming(pressedScale, timing))}
        onPressOut={() => {
          scale.value = withTiming(1, timing);
          onPressOut?.();
        }}
        style={({ pressed }) => [
          styles.base,
          variant === 'raised' ? styles.raised : styles.ghost,
          { backgroundColor: pressed ? colors.paper2 : rest },
        ]}>
        <Icon color={colors.textPrimary} size={20} strokeWidth={2} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: layout.hitMin,
    height: layout.hitMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  raised: {
    borderRadius: radius.pill,
    borderWidth: layout.borderWidth,
    borderColor: colors.borderDefault,
    boxShadow: shadow[2],
  },
  ghost: {
    borderRadius: radius.md,
  },
});
