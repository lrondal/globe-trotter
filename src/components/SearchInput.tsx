// The design system's search input: a 44 pt pill with a leading search icon, and a button
// clearing what was typed.
import { Search, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, layout, radius, shadow, space, text } from '@/theme/tokens';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  onFocus?: () => void;
  onBlur?: () => void;
  autoFocus?: boolean;
};

export function SearchInput({ value, onChangeText, placeholder, onFocus, onBlur, autoFocus }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.pill, focused && styles.pillFocused]}>
      <Search color={colors.ink3} size={18} strokeWidth={2} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        autoCorrect={false}
        style={styles.input}
      />
      {value !== '' && (
        <Pressable accessibilityRole="button" accessibilityLabel="Effacer la recherche" hitSlop={8} onPress={() => onChangeText('')}>
          <X color={colors.ink3} size={18} strokeWidth={2} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    height: layout.hitMin,
    paddingHorizontal: 14,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    borderWidth: layout.borderWidth,
    borderColor: colors.borderStrong,
    boxShadow: shadow[1],
  },
  // Focus shows an ink border, never a glow.
  pillFocused: {
    borderColor: colors.borderFocus,
  },
  input: {
    ...text.body,
    flex: 1,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
});
