import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors, fonts, layout, pressFeedback, radius, text } from '@/theme/tokens';

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost';
type Size = 'md' | 'sm';

type Props = {
  children: ReactNode;
  /** Drawn before the label. */
  icon?: LucideIcon;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const VARIANTS: Record<Variant, { bg: string; bgPressed: string; fg: string; border: string }> = {
  primary: { bg: colors.ink1, bgPressed: colors.ink2, fg: colors.textInverse, border: 'transparent' },
  accent: { bg: colors.accent, bgPressed: colors.accentPress, fg: colors.textOnAccent, border: 'transparent' },
  secondary: { bg: colors.surfaceRaised, bgPressed: colors.paper2, fg: colors.textPrimary, border: colors.borderStrong },
  ghost: { bg: 'transparent', bgPressed: colors.paper2, fg: colors.textPrimary, border: 'transparent' },
};

const SIZES: Record<Size, { height: number; paddingHorizontal: number; fontSize: number; iconSize: number }> = {
  md: { height: layout.hitMin, paddingHorizontal: 18, fontSize: text.body.fontSize, iconSize: 18 },
  sm: { height: 36, paddingHorizontal: 14, fontSize: text.bodyS.fontSize, iconSize: 16 },
};

const { scale: pressedScale, duration, easing } = pressFeedback.button;
const timing = { duration, easing: Easing.bezier(...easing) };

export function Button({
  children,
  icon: Icon,
  onPress,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  style,
}: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const v = VARIANTS[variant];
  const s = SIZES[size];
  const fg = disabled ? colors.textDisabled : v.fg;

  return (
    <Animated.View style={[{ alignSelf: fullWidth ? 'stretch' : 'flex-start' }, animatedStyle, style]}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => (scale.value = withTiming(pressedScale, timing))}
        onPressOut={() => (scale.value = withTiming(1, timing))}
        style={({ pressed }) => [
          styles.base,
          {
            height: s.height,
            paddingHorizontal: s.paddingHorizontal,
            backgroundColor: disabled
              ? variant === 'ghost'
                ? 'transparent'
                : colors.paper2
              : pressed
                ? v.bgPressed
                : v.bg,
            borderColor: disabled ? 'transparent' : v.border,
          },
        ]}>
        {Icon && <Icon color={fg} size={s.iconSize} strokeWidth={2} />}
        <Text numberOfLines={1} style={[styles.label, { fontSize: s.fontSize, color: fg }]}>
          {children}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: layout.borderWidth,
    borderRadius: radius.md,
  },
  label: {
    fontFamily: fonts.sansMedium,
  },
});
