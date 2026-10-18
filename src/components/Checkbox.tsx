import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, layout, radius, space, text } from '@/theme/tokens';

type Props = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/** Square ink checkbox; a checked label is struck through and muted. */
export function Checkbox({ label, checked, onChange }: Props) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={styles.row}>
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked && <Check color={colors.textInverse} size={14} strokeWidth={2.5} />}
      </View>
      <Text style={[styles.label, checked && styles.labelChecked]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
    minHeight: layout.hitMin,
    paddingVertical: space[2],
  },
  box: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xs,
    borderWidth: 1.5,
    borderColor: colors.ink3,
  },
  boxChecked: {
    backgroundColor: colors.ink1,
    borderColor: colors.ink1,
  },
  label: {
    ...text.body,
    flex: 1,
    color: colors.textPrimary,
  },
  labelChecked: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
});
