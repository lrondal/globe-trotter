import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme/tokens';

// The globe arrives in its own slice; for now the tab is the bare paper page.
export default function GlobeScreen() {
  return <View style={styles.screen} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surfacePage,
  },
});
