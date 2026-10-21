// « Rechercher un lieu »: the search pill over the globe, and what it finds under it, grouped
// Pays / Îles / Régions / Villes. The Atlas searches on the phone, offline, as the user types.
import { Search, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { atlas, countries, type CityMatch, type CountryRecord, type RegionRecord, type SearchResults } from '@/atlas';
import { colors, layout, radius, shadow, space, text } from '@/theme/tokens';

/** A Place picked among the results. */
export type Picked =
  | { level: 'country' | 'island'; place: CountryRecord }
  | { level: 'region'; place: RegionRecord }
  | { level: 'city'; place: CityMatch };

type Props = { onPick: (picked: Picked) => void };

/** A result as listed: its name, and where it is. */
type Row = { key: string; name: string; meta?: string; picked: Picked };

/** The name of a Country or Island, by id. */
const nameOf = (id: string | undefined) => countries.find((c) => c.id === id)?.name;

/** Where a City is, under its name: the alias it was found by, its Island or Region, its Country. */
const whereIs = (city: CityMatch) =>
  [city.alias, nameOf(city.islandId) ?? (city.regionId && atlas.region(city.regionId)?.name), nameOf(city.countryId)]
    .filter(Boolean)
    .join(' · ');

export function SearchBar({ onPick }: Props) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);

  // Read in the background soon after launch, so that the first search is instant too.
  useEffect(() => {
    void atlas.loadCities();
  }, []);
  useEffect(() => {
    let current = true;
    atlas.search(query).then((found) => {
      if (current) setResults(found);
    });
    return () => {
      current = false;
    };
  }, [query]);

  const pick = (picked: Picked) => {
    Keyboard.dismiss();
    setQuery('');
    onPick(picked);
  };

  const row = (picked: Picked, meta?: string): Row => ({ key: picked.place.id, name: picked.place.name, meta, picked });
  const groups =
    results &&
    [
      { title: 'Pays', rows: results.countries.map((place) => row({ level: 'country', place })) },
      { title: 'Îles', rows: results.islands.map((place) => row({ level: 'island', place }, nameOf(place.countryId))) },
      { title: 'Régions', rows: results.regions.map((place) => row({ level: 'region', place }, nameOf(place.countryId))) },
      { title: 'Villes', rows: results.cities.map((place) => row({ level: 'city', place }, whereIs(place))) },
    ].filter((group) => group.rows.length > 0);
  const open = focused && query.trim() !== '' && groups !== null;

  return (
    <View style={styles.search} pointerEvents="box-none">
      <View style={[styles.pill, focused && styles.pillFocused]}>
        <Search color={colors.ink3} size={18} strokeWidth={2} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Rechercher un lieu"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          autoCorrect={false}
          style={styles.input}
        />
        {query !== '' && (
          <Pressable accessibilityRole="button" accessibilityLabel="Effacer la recherche" hitSlop={8} onPress={() => setQuery('')}>
            <X color={colors.ink3} size={18} strokeWidth={2} />
          </Pressable>
        )}
      </View>
      {open && (
        <View style={styles.results}>
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            {groups.length === 0 && <Text style={styles.empty}>Aucun lieu trouvé.</Text>}
            {groups.map((group) => (
              <View key={group.title} style={styles.group}>
                <Text style={styles.overline}>{group.title}</Text>
                {group.rows.map((row) => (
                  <Pressable
                    key={row.key}
                    accessibilityRole="button"
                    onPress={() => pick(row.picked)}
                    style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.paper2 }]}>
                    <Text style={styles.name} numberOfLines={1}>
                      {row.name}
                    </Text>
                    {row.meta ? (
                      <Text style={styles.meta} numberOfLines={1}>
                        {row.meta}
                      </Text>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    gap: space[3],
  },
  // The design system's search input: a 44 pt pill with a leading search icon.
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
  results: {
    maxHeight: 360,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    boxShadow: shadow[2],
    overflow: 'hidden',
  },
  group: {
    paddingTop: space[4],
  },
  // 11 pt, uppercase, +0.08 em.
  overline: {
    ...text.overline,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 11 * 0.08,
    paddingHorizontal: space[5],
    paddingBottom: space[2],
  },
  row: {
    minHeight: layout.hitMin,
    justifyContent: 'center',
    paddingHorizontal: space[5],
    paddingVertical: space[2],
    borderBottomWidth: layout.borderWidth,
    borderBottomColor: colors.borderDefault,
  },
  name: {
    ...text.bodyStrong,
    color: colors.textPrimary,
  },
  meta: {
    ...text.bodyS,
    color: colors.textMuted,
  },
  empty: {
    ...text.body,
    color: colors.textSecondary,
    padding: space[5],
  },
});
