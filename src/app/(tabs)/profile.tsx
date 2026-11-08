import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ListScreen } from '@/components/ListScreen';
import { Switch } from '@/components/Switch';
import { useJournal } from '@/journal/JournalProvider';
import { usePreferences } from '@/profile/PreferencesProvider';
import { statsLine } from '@/profile/stats';
import { colors, space, text } from '@/theme/tokens';

/** Where the map's data comes from, and under what terms: what its licences ask the app to say. */
const CREDITS = [
  { source: 'Natural Earth', what: 'Frontières des pays et territoires, domaine public.' },
  {
    source: 'geoBoundaries',
    what:
      'Limites des régions (William & Mary geoLab), CC BY 4.0, d’après des sources ouvertes ' +
      'propres à chaque pays, dont © les contributeurs d’OpenStreetMap (ODbL).',
  },
  { source: 'GeoNames', what: 'Villes et leurs noms, CC BY 4.0.' },
];

export default function ProfileScreen() {
  const { journal } = useJournal();
  const { photosOnGlobe, autoRotate, set } = usePreferences();

  return (
    <ListScreen title="Profil">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.stats}>{statsLine(journal.visitedCounts())}</Text>

        <Text accessibilityRole="header" style={styles.overline}>
          Globe
        </Text>
        <Switch label="Photos sur le globe" checked={photosOnGlobe} onChange={(on) => set('photosOnGlobe', on)} />
        <Switch label="Rotation automatique" checked={autoRotate} onChange={(on) => set('autoRotate', on)} />

        <Text accessibilityRole="header" style={styles.overline}>
          Crédits
        </Text>
        <View style={styles.credits}>
          {CREDITS.map(({ source, what }) => (
            <Text key={source} style={styles.credit}>
              <Text style={styles.source}>{source}</Text> — {what}
            </Text>
          ))}
        </View>
      </ScrollView>
    </ListScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: space[7],
  },
  stats: {
    ...text.bodyS,
    color: colors.textMuted,
    marginBottom: space[3],
  },
  // 11 pt, uppercase, +0.08 em, as the design's section titles.
  overline: {
    ...text.overline,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 11 * 0.08,
    marginTop: space[6],
    marginBottom: space[1],
  },
  credits: {
    gap: space[3],
    paddingTop: space[3],
  },
  credit: {
    ...text.bodyS,
    color: colors.textSecondary,
  },
  source: {
    fontFamily: text.label.fontFamily,
    color: colors.textPrimary,
  },
});
