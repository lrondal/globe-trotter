// The Wishlist view (« Envies »): every Place marked Wish, by name (see Journal.wishlist).
// A row flies the globe to its Place, framed for its level, and selects it.
import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ListScreen } from '@/components/ListScreen';
import { PlaceRow } from '@/components/PlaceRow';
import { useShowOnGlobe } from '@/globe/ShowOnGlobeProvider';
import type { PlaceRef } from '@/journal/journal';
import { useJournal } from '@/journal/JournalProvider';
import { placeName } from '@/journal/placeName';
import { wishlistView, type WishRow } from '@/journal/view';
import { colors, space, text } from '@/theme/tokens';

export default function WishlistScreen() {
  const { journal, version } = useJournal();
  const { show } = useShowOnGlobe();

  // Read anew after every change to the Journal.
  const view = useMemo(() => {
    const nameOf = (place: PlaceRef) => placeName(journal, place);
    const noteOf = (place: PlaceRef) => journal.place(place)?.note ?? '';
    const whereOf = (place: PlaceRef) => {
      if (place.level === 'country') return '';
      const countryId = journal.countryOf(place);
      return countryId ? nameOf({ level: 'country', id: countryId }) : '';
    };
    return wishlistView(journal.wishlist(), { nameOf, noteOf, whereOf });
  }, [journal, version]);

  if (view.rows.length === 0) {
    return (
      <ListScreen title="Envies">
        <EmptyState message="Aucune envie pour l’instant.">
          <Button variant="secondary" onPress={() => router.navigate('/')}>
            Ouvrir le globe
          </Button>
        </EmptyState>
      </ListScreen>
    );
  }

  /** The globe screen, kept mounted under this one, flies there and selects it. */
  const showOnGlobe = (place: PlaceRef) => {
    show(place);
    router.navigate('/');
  };

  return (
    <ListScreen title="Envies">
      <Text style={styles.count}>{view.count}</Text>
      <FlatList
        data={view.rows}
        keyExtractor={(row: WishRow) => `${row.place.level}:${row.place.id}`}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <PlaceRow
            name={item.name}
            meta={item.meta}
            status={journal.status(item.place)}
            thumbnail={journal.coverPhoto(item.place)?.thumbnail ?? null}
            last={index === view.rows.length - 1}
            onPress={() => showOnGlobe(item.place)}
          />
        )}
      />
    </ListScreen>
  );
}

const styles = StyleSheet.create({
  // Tabular numbers for counts.
  count: {
    ...text.bodyS,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
    marginBottom: space[2],
  },
  list: {
    paddingBottom: space[7],
  },
});
