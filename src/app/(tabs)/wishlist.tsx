// The Wishlist view (Â« Envies Â»): every Place marked Wish, by name (see Journal.wishlist).
// Â« + Â» searches every Place, and marks Wish the one picked. A row opens the page of its
// Place's Country, scrolled to it; its map pin flies the globe there, framed for its level.
import { router } from 'expo-router';
import { MapPin, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { ListScreen } from '@/components/ListScreen';
import { PlaceRow } from '@/components/PlaceRow';
import { Toast } from '@/components/Toast';
import { useShowOnGlobe } from '@/globe/ShowOnGlobeProvider';
import type { PlaceRef } from '@/journal/journal';
import { useJournal } from '@/journal/JournalProvider';
import { placeName } from '@/journal/placeName';
import { wishlistView, type WishRow } from '@/journal/view';
import { SearchBar } from '@/search/SearchBar';
import { useWishPick } from '@/search/useWishPick';
import { colors, space, text } from '@/theme/tokens';

export default function WishlistScreen() {
  const { journal, version, undo } = useJournal();
  const { show } = useShowOnGlobe();
  const [adding, setAdding] = useState(false);
  const { pick: wishPicked, notice, hideNotice } = useWishPick();

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

  const customCities = useMemo(() => journal.cities().filter((city) => city.custom), [journal, version]);

  const pick: typeof wishPicked = (picked) => {
    setAdding(false);
    wishPicked(picked);
  };

  /** The globe screen, kept mounted under this one, flies there and selects it. */
  const showOnGlobe = (place: PlaceRef) => {
    show(place);
    router.navigate('/');
  };
  /** The page of its Country, scrolled to it unless it is the Country. */
  const openCountryPage = (place: PlaceRef) => {
    if (place.level === 'country') {
      router.push({ pathname: '/country/[id]', params: { id: place.id } });
      return;
    }
    const countryId = journal.countryOf(place);
    if (!countryId) return;
    router.push({ pathname: '/country/[id]', params: { id: countryId, level: place.level, place: place.id } });
  };

  const add = !adding && view.rows.length > 0 && (
    <IconButton variant="ghost" icon={Plus} label="Ajouter une envie" onPress={() => setAdding(true)} />
  );

  return (
    <ListScreen title="Envies" action={add}>
      {adding && (
        <View style={styles.search}>
          <View style={styles.searchBar}>
            <SearchBar onPick={pick} customCities={customCities} autoFocus />
          </View>
          <Button variant="ghost" size="sm" onPress={() => setAdding(false)}>
            Annuler
          </Button>
        </View>
      )}
      {view.rows.length === 0 ? (
        !adding && (
          <EmptyState message="Aucune envie pour lâ€™instant.">
            <Button variant="secondary" icon={Plus} onPress={() => setAdding(true)}>
              Ajouter une envie
            </Button>
          </EmptyState>
        )
      ) : (
        <>
          <Text style={styles.count}>{view.count}</Text>
          <FlatList
            data={view.rows}
            keyExtractor={(row: WishRow) => `${row.place.level}:${row.place.id}`}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => (
              <PlaceRow
                name={item.name}
                meta={item.meta}
                status={journal.status(item.place)}
                thumbnail={journal.coverPhoto(item.place)?.thumbnail ?? null}
                last={index === view.rows.length - 1}
                action={{ icon: MapPin, label: `Voir ${item.name} sur le globe`, onPress: () => showOnGlobe(item.place) }}
                onPress={() => openCountryPage(item.place)}
              />
            )}
          />
        </>
      )}
      {notice && (
        <View style={styles.toast} pointerEvents="box-none">
          <Toast
            key={notice.key}
            message={notice.message}
            action={notice.undoable ? 'Annuler' : undefined}
            onAction={undo}
            onHide={hideNotice}
          />
        </View>
      )}
    </ListScreen>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[2],
    paddingBottom: space[3],
    zIndex: 1,
  },
  searchBar: {
    flex: 1,
  },
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
  toast: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: space[4],
  },
});
