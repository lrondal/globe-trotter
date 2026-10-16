import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, layout, space } from '@/theme/tokens';

/** Frame for the Journal, Wishlist and Profile tabs: a sans-serif screen title above the content. */
export function ListScreen({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surfacePage,
    paddingHorizontal: layout.screenGutter,
  },
  title: {
    fontFamily: fonts.sansSemibold,
    fontSize: 28,
    letterSpacing: 28 * -0.02,
    color: colors.textPrimary,
    paddingTop: space[5],
    paddingBottom: space[4],
  },
  content: {
    flex: 1,
  },
});
