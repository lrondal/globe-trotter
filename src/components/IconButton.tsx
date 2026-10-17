import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors, layout, pressFeedback, radius, shadow } from '@/theme/tokens';

type Props = {
  icon: LucideIcon;
  /** Spoken by VoiceOver: the button has no visible text. */
  label: string;
  onPress?: () => void;
};

const { scale: pressedScale, duration, easing } = pressFeedback.iconButton;
const timing = { duration, easing: Easing.bezier(...easing) };

/** Round raised icon button, for controls floating over the globe. */
export function IconButton({ icon: Icon, label, onPress }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={() => (scale.value = withTiming(pressedScale, timing))}
        onPressOut={() => (scale.value = withTiming(1, timing))}
        style={({ pressed }) => [styles.base, { backgroundColor: pressed ? colors.paper2 : colors.surfaceRaised }]}>
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
    borderRadius: radius.pill,
    borderWidth: layout.borderWidth,
    borderColor: colors.borderDefault,
    boxShadow: shadow[2],
  },
});
