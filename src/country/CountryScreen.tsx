// A Country's page, from the Journal (« Carnet »): its Regions with their Cities, its Islands
// with theirs, and its other Cities, those with a Mark or content (see Journal.countryPage).
// A row opens its Place's Note. « Ajouter une destination » searches this Country only, and
// marks the Place picked Wish, so it takes its place in the page. Opened on one of its Places,
// from the Wishlist say, it scrolls to that Place's row and highlights it.
import { router } from 'expo-router';
import { ChevronLeft, MapPin, NotebookPen, Plus } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { HIGHLIGHT_FOR, PlaceRow } from '@/components/PlaceRow';
import { STATUS_LABEL, StatusBadge } from '@/components/StatusBadge';
import { Toast } from '@/components/Toast';
import { useShowOnGlobe } from '@/globe/ShowOnGlobeProvider';
import type { PlaceRef } from '@/journal/journal';
import { useJournal } from '@/journal/JournalProvider';
import { placeName } from '@/journal/placeName';
import { countrySections, countryView, rowLocation, type PageRow, type PageSection } from '@/journal/view';
import { SearchBar } from '@/search/SearchBar';
import { useWishPick } from '@/search/useWishPick';
import { formatVisitDates } from '@/sheet/visitDate';
import { colors, layout, space, text } from '@/theme/tokens';

const openNote = ({ level, id }: PlaceRef) => router.push({ pathname: '/note/[level]/[id]', params: { level, id } });
const keyOf = ({ level, id }: PlaceRef) => `${level}:${id}`;

/** Where the row arrived at is set: a third of the way down the list. */
const FOCUS_POSITION = 0.3;

type Props = {
  countryId: string;
  /** One of its Places, to scroll to and highlight. */
  focus?: PlaceRef;
};

export function CountryScreen({ countryId, focus }: Props) {
  const { journal, version, undo } = useJournal();
  const { show } = useShowOnGlobe();
  const insets = useSafeAreaInsets();
  const [adding, setAdding] = useState(false);
  const { pick: wishPicked, notice, hideNotice } = useWishPick();

  const country: PlaceRef = { level: 'country', id: countryId };
  const name = placeName(journal, country);

  // Read anew after every change to the Journal.
  const sections = useMemo(
    (): PageSection[] =>
      countrySections(countryView(journal.countryPage(countryId), { nameOf: (place) => placeName(journal, place) })),
    [journal, version, countryId],
  );

  // The Place arrived at: its row is rendered from the start, scrolled to once laid out, and
  // highlighted for a moment.
  const listRef = useRef<SectionList<PageRow, PageSection>>(null);
  const [arrival] = useState(() => (focus ? rowLocation(sections, focus) : null));
  const [highlighted, setHighlighted] = useState(() => (arrival && focus ? keyOf(focus) : null));
  const scrolled = useRef(false);
  /** Tries left at scrolling to a row not laid out yet. */
  const retries = useRef(3);
  useEffect(() => {
    if (!highlighted) return;
    // Once its tint has faded, so that the row scrolled away and back is not tinted again.
    const timer = setTimeout(() => setHighlighted(null), HIGHLIGHT_FOR);
    return () => clearTimeout(timer);
  }, [highlighted]);
  /** Its index among the list's cells, a header and a footer to each section, for the first render. */
  const arrivalCell =
    arrival && sections.slice(0, arrival.sectionIndex).reduce((n, s) => n + s.data.length + 2, arrival.itemIndex + 1);
  const scrollToArrival = () => {
    if (!arrival || scrolled.current) return;
    scrolled.current = true;
    // A section's header is its item 0.
    listRef.current?.scrollToLocation({ ...arrival, itemIndex: arrival.itemIndex + 1, viewPosition: FOCUS_POSITION });
  };
  const customCities = useMemo(
    () => journal.cities().filter((city) => city.custom && city.countryId === countryId),
    [journal, version, countryId],
  );

  /** « Avril 2024 · Visité »: its Visit dates, if any, and its Status. */
  const metaOf = (place: PlaceRef) => {
    const dates = journal.visitDates(place);
    return [dates && formatVisitDates(dates), STATUS_LABEL[journal.status(place)]].filter(Boolean).join(' · ');
  };
  const dates = journal.visitDates(country);

  const showOnGlobe = () => {
    show(country);
    router.dismissTo('/');
  };

  /** Marks the Place picked Wish, unless it has a Mark already: it is in the page already then. */
  const pick: typeof wishPicked = (picked) => {
    setAdding(false);
    wishPicked(picked);
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <IconButton variant="ghost" icon={ChevronLeft} label="Retour" onPress={() => router.back()} />
      </View>
      <View style={styles.heading}>
        <Text style={styles.overline}>Pays</Text>
        <Text accessibilityRole="header" style={styles.title} numberOfLines={2}>
          {name}
        </Text>
        <View style={styles.statusLine}>
          <StatusBadge status={journal.status(country)} />
          {dates && <Text style={styles.dates}>{formatVisitDates(dates)}</Text>}
        </View>
        <View style={styles.actions}>
          <Button variant="secondary" size="sm" icon={NotebookPen} onPress={() => openNote(country)}>
            Note
          </Button>
          <Button variant="secondary" size="sm" icon={MapPin} onPress={showOnGlobe}>
            Voir sur le globe
          </Button>
        </View>
        {adding ? (
          <View style={styles.search}>
            <View style={styles.searchBar}>
              <SearchBar
                onPick={pick}
                countryId={countryId}
                customCities={customCities}
                placeholder="Rechercher une région, une île, une ville"
                autoFocus
              />
            </View>
            <Button variant="ghost" size="sm" onPress={() => setAdding(false)}>
              Annuler
            </Button>
          </View>
        ) : (
          <Button variant="primary" icon={Plus} fullWidth onPress={() => setAdding(true)}>
            Ajouter une destination
          </Button>
        )}
      </View>
      <SectionList
        ref={listRef}
        sections={sections}
        keyExtractor={(row: PageRow) => keyOf(row.place)}
        initialNumToRender={Math.max(10, (arrivalCell ?? 0) + 6)}
        onContentSizeChange={scrollToArrival}
        onScrollToIndexFailed={({ averageItemLength, index }) => {
          // Not laid out yet: near it first, then to it once its row is.
          listRef.current?.getScrollResponder()?.scrollTo({ y: averageItemLength * index, animated: false });
          if (retries.current-- <= 0) return;
          scrolled.current = false;
          requestAnimationFrame(scrollToArrival);
        }}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + space[7] }]}
        ListEmptyComponent={<Text style={styles.empty}>Aucune région, île ni ville dans le carnet.</Text>}
        renderSectionHeader={({ section }) => <Text style={[styles.overline, styles.sectionTitle]}>{section.title}</Text>}
        renderItem={({ item, index, section }) => (
          <View style={item.indented && styles.indented}>
            <PlaceRow
              name={item.name}
              meta={metaOf(item.place)}
              status={journal.status(item.place)}
              thumbnail={journal.coverPhoto(item.place)?.thumbnail ?? null}
              last={index === section.data.length - 1}
              highlighted={highlighted === keyOf(item.place)}
              onPress={() => openNote(item.place)}
            />
          </View>
        )}
      />
      {notice && (
        <View style={[styles.toast, { bottom: insets.bottom + space[4] }]} pointerEvents="box-none">
          <Toast
            key={notice.key}
            message={notice.message}
            action={notice.undoable ? 'Annuler' : undefined}
            onAction={undo}
            onHide={hideNotice}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surfacePage,
  },
  topBar: {
    flexDirection: 'row',
    paddingHorizontal: space[4],
    paddingBottom: space[2],
  },
  heading: {
    paddingHorizontal: layout.screenGutter,
    gap: space[3],
    paddingBottom: space[3],
  },
  // 11 pt, uppercase, +0.08 em.
  overline: {
    ...text.overline,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 11 * 0.08,
  },
  title: {
    ...text.displayXl,
    color: colors.textPrimary,
    letterSpacing: 44 * -0.01,
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  dates: {
    ...text.caption,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  actions: {
    flexDirection: 'row',
    gap: space[2],
  },
  search: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[2],
    zIndex: 1,
  },
  searchBar: {
    flex: 1,
  },
  list: {
    paddingHorizontal: layout.screenGutter,
  },
  sectionTitle: {
    marginTop: space[5],
  },
  // A City under its Region or Island.
  indented: {
    paddingLeft: space[6],
  },
  empty: {
    ...text.body,
    color: colors.textSecondary,
    paddingTop: space[5],
  },
  toast: {
    position: 'absolute',
    left: layout.screenGutter,
    right: layout.screenGutter,
  },
});
