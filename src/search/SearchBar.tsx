// « Rechercher un lieu »: the search pill over the globe, and what it finds under it, grouped
// Pays / Îles / Régions / Villes. The Atlas searches on the phone, offline, as the user types.
// On a Country's page, it searches that Country only, its Custom Cities included.
import { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { atlas, countries, type CityMatch, type CountryRecord, type RegionRecord, type SearchResults } from '@/atlas';
import { fold, rankOf } from '@/atlas/cities';
import { SearchInput } from '@/components/SearchInput';
import type { City } from '@/journal/journal';
import { colors, layout, radius, shadow, space, text } from '@/theme/tokens';

/** A Place picked among the results. */
export type Picked =
  | { level: 'country' | 'island'; place: CountryRecord }
  | { level: 'region'; place: RegionRecord }
  | { level: 'city'; place: CityMatch };

type Props = {
  onPick: (picked: Picked) => void;
  /** Searches only this Country, and its Custom Cities as well as the list's. */
  within?: { countryId: string; customCities: readonly City[] };
  placeholder?: string;
  autoFocus?: boolean;
};

/** A result as listed: its name, and where it is. */
type Row = { key: string; name: string; meta?: string; picked: Picked };

/** The name of a Country or Island, by id. */
const nameOf = (id: string | undefined) => countries.find((c) => c.id === id)?.name;

/** Where a City is, under its name: the alias it was found by, its Island or Region, its Country. */
const whereIs = (city: CityMatch) =>
  [city.alias, nameOf(city.islandId) ?? (city.regionId && atlas.region(city.regionId)?.name), nameOf(city.countryId)]
    .filter(Boolean)
    .join(' · ');

/**
 * The Custom Cities whose name, or a word of it, starts with `query`, as the search lists
 * Cities: those found by their start first, then by name.
 */
function customMatches(cities: readonly City[], query: string): CityMatch[] {
  const q = fold(query);
  if (q === '') return [];
  return cities
    .map((city) => ({ city, rank: rankOf(fold(city.name), q) }))
    .filter(({ rank }) => rank !== null)
    .sort((a, b) => a.rank! - b.rank! || a.city.name.localeCompare(b.city.name, 'fr'))
    .map(({ city }) => city)
    .map(({ id, name, lon, lat, countryId, islandId, regionId }) => ({ id, name, aliases: [], lon, lat, countryId, islandId, regionId }));
}

export function SearchBar({ onPick, within, placeholder = 'Rechercher un lieu', autoFocus }: Props) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);

  // Read in the background soon after launch, so that the first search is instant too.
  useEffect(() => {
    void atlas.loadCities();
  }, []);
  const countryId = within?.countryId;
  const customCities = within?.customCities;
  useEffect(() => {
    let current = true;
    atlas.search(query, countryId ? { countryId } : undefined).then((found) => {
      if (!current) return;
      const custom = customCities ? customMatches(customCities, query) : [];
      setResults(custom.length > 0 ? { ...found, cities: [...custom, ...found.cities] } : found);
    });
    return () => {
      current = false;
    };
  }, [query, countryId, customCities]);

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
      <SearchInput
        value={query}
        onChangeText={setQuery}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
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
