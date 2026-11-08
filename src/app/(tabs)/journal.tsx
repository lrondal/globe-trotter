// The Journal view (« Carnet »): every Place with a Mark or content, grouped by Country (see
// Journal.byCountry). A group's header, or its Country's row, opens the Country's page; another
// row opens the Place's Note; a group's map pin shows its Country on the globe.
import { router } from 'expo-router';
import { MapPin } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

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
import { placeName } from '@/journal/placeName';
import { journalView, type ViewRow } from '@/journal/view';
import { formatVisitDates } from '@/sheet/visitDate';
import { colors, space, text } from '@/theme/tokens';

export default function JournalScreen() {
  const { journal, version } = useJournal();
  const { show } = useShowOnGlobe();
  const [query, setQuery] = useState('');

  // Read anew after every change to the Journal.
  const listed = useMemo(() => journal.byCountry(), [journal, version]);
  const groups = useMemo(() => {
    const nameOf = (place: PlaceRef) => placeName(journal, place);
    const noteOf = (place: PlaceRef) => journal.place(place)?.note ?? '';
    return journalView(listed, { nameOf, noteOf }, query).map((group) => ({ ...group, data: group.rows }));
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
  const openCountry = (id: string) => router.push({ pathname: '/country/[id]', params: { id } });
  /** A Country's page, or another Place's Note. */
  const open = ({ level, id }: PlaceRef) =>
    level === 'country' ? openCountry(id) : router.push({ pathname: '/note/[level]/[id]', params: { level, id } });
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
        keyExtractor={(row: ViewRow) => `${row.place.level}:${row.place.id}`}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Aucun lieu trouvé.</Text>}
        renderSectionHeader={({ section }) => (
          <View style={styles.header}>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Ouvrir la page ${section.name}`}
              hitSlop={8}
              onPress={() => openCountry(section.countryId)}
              style={styles.headerLink}>
              <Text style={styles.overline} numberOfLines={1}>
                {section.name}
              </Text>
            </Pressable>
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
            onPress={() => open(item.place)}
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
  headerLink: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  // 11 pt, uppercase, +0.08 em.
  overline: {
    ...text.overline,
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
