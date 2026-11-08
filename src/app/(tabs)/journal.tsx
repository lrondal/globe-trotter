// The Carnet: every Place with a Mark or content, grouped by Country (see Journal.byCountry).
// A row opens the Place's Note; a group's map pin shows its Country on the globe.
import { router } from 'expo-router';
import { MapPin } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';

import { atlas, countries } from '@/atlas';
import { carnetGroups, type CarnetRow } from '@/carnet/carnet';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { ListScreen } from '@/components/ListScreen';
import { PlaceRow } from '@/components/PlaceRow';
import { SearchInput } from '@/components/SearchInput';
import { STATUS_LABEL } from '@/components/StatusBadge';
import { useShowOnGlobe } from '@/globe/ShowOnGlobeProvider';
import type { PlaceRef } from '@/journal/journal';
import { useJournal } from '@/journal/JournalProvider';
import { formatVisitDates } from '@/sheet/visitDate';
import { colors, space, text } from '@/theme/tokens';

export default function JournalScreen() {
  const { journal, version } = useJournal();
  const { show } = useShowOnGlobe();
  const [query, setQuery] = useState('');

  // Read anew after every change to the Journal.
  const listed = useMemo(() => journal.byCountry(), [journal, version]);
  const groups = useMemo(() => {
    const nameOf = (place: PlaceRef) => {
      if (place.level === 'city') return journal.city(place.id)?.name ?? '';
      if (place.level === 'region') return atlas.region(place.id)?.name ?? '';
      return countries.find((c) => c.id === place.id)?.name ?? '';
    };
    const noteOf = (place: PlaceRef) => journal.place(place)?.note ?? '';
    return carnetGroups(listed, { nameOf, noteOf }, query).map((group) => ({ ...group, data: group.rows }));
  }, [journal, listed, query]);

  if (listed.length === 0) {
    return (
      <ListScreen title="Carnet">
        <EmptyState message="Aucun lieu dans le carnet.">
          <Button variant="secondary" onPress={() => router.navigate('/')}>
            Ouvrir le globe
          </Button>
        </EmptyState>
      </ListScreen>
    );
  }

  const showCountry = (countryId: string) => {
    show({ level: 'country', id: countryId });
    router.navigate('/');
  };
  const openNote = ({ level, id }: PlaceRef) => router.push({ pathname: '/note/[level]/[id]', params: { level, id } });
  /** « Avril 2024 · Visité »: its Visit dates, if any, and its Status. */
  const metaOf = (place: PlaceRef) => {
    const dates = journal.visitDates(place);
    return [dates && formatVisitDates(dates), STATUS_LABEL[journal.status(place)]].filter(Boolean).join(' · ');
  };

  return (
    <ListScreen title="Carnet">
      <SearchInput value={query} onChangeText={setQuery} placeholder="Rechercher dans le carnet" />
      <SectionList
        sections={groups}
        keyExtractor={(row: CarnetRow) => `${row.place.level}:${row.place.id}`}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Aucun lieu trouvé.</Text>}
        renderSectionHeader={({ section }) => (
          <View style={styles.header}>
            <Text style={styles.overline} numberOfLines={1}>
              {section.name}
            </Text>
            <IconButton
              variant="ghost"
              icon={MapPin}
              label={`Voir ${section.name} sur le globe`}
              onPress={() => showCountry(section.countryId)}
            />
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <PlaceRow
            name={item.name}
            meta={metaOf(item.place)}
            status={journal.status(item.place)}
            thumbnail={journal.coverPhoto(item.place)?.thumbnail ?? null}
            last={index === section.data.length - 1}
            onPress={() => openNote(item.place)}
          />
        )}
      />
    </ListScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingTop: space[3],
    paddingBottom: space[7],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space[3],
  },
  // 11 pt, uppercase, +0.08 em.
  overline: {
    ...text.overline,
    flex: 1,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 11 * 0.08,
  },
  empty: {
    ...text.body,
    color: colors.textSecondary,
    paddingTop: space[5],
  },
});
