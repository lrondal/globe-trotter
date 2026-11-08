// A Country's page, from the Journal (« Carnet »): its Regions with their Cities, its Islands
// with theirs, and its other Cities, those with a Mark or content (see Journal.countryPage).
// A row opens its Place's Note. « Ajouter une destination » searches this Country only, and
// marks the Place picked Wish, so it takes its place in the page.
import { router } from 'expo-router';
import { ChevronLeft, MapPin, NotebookPen, Plus } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cityPlace } from '@/atlas';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { PlaceRow } from '@/components/PlaceRow';
import { STATUS_LABEL, StatusBadge } from '@/components/StatusBadge';
import { Toast } from '@/components/Toast';
import { useShowOnGlobe } from '@/globe/ShowOnGlobeProvider';
import type { City, PlaceRef } from '@/journal/journal';
import { useJournal } from '@/journal/JournalProvider';
import { placeName } from '@/journal/placeName';
import { countryView, type ViewBranch, type ViewRow } from '@/journal/view';
import { SearchBar, type Picked } from '@/search/SearchBar';
import { formatVisitDates } from '@/sheet/visitDate';
import { colors, layout, space, text } from '@/theme/tokens';

/** A row of the page: a Region's or an Island's, or a City's, set under its Region or Island. */
type Row = ViewRow & { indented: boolean };
type Section = { title: string; data: Row[] };

/** A Region or an Island, then its Cities, set under it. */
const rowsOf = (branches: readonly ViewBranch[]): Row[] =>
  branches.flatMap(({ row, cities }) => [
    { ...row, indented: false },
    ...cities.map((city) => ({ ...city, indented: true })),
  ]);

const openNote = ({ level, id }: PlaceRef) => router.push({ pathname: '/note/[level]/[id]', params: { level, id } });

export function CountryScreen({ countryId }: { countryId: string }) {
  const { journal, version, mark, undo } = useJournal();
  const { show } = useShowOnGlobe();
  const insets = useSafeAreaInsets();
  const [adding, setAdding] = useState(false);
  /** What the last pick did, with « Annuler » when it marked the Place. */
  const [notice, setNotice] = useState<{ key: number; message: string; undoable: boolean } | null>(null);
  const hideNotice = useCallback(() => setNotice(null), []);

  const country: PlaceRef = { level: 'country', id: countryId };
  const name = placeName(journal, country);

  // Read anew after every change to the Journal.
  const sections = useMemo((): Section[] => {
    const view = countryView(journal.countryPage(countryId), { nameOf: (place) => placeName(journal, place) });
    return [
      { title: 'Régions', data: rowsOf(view.regions) },
      { title: 'Îles', data: rowsOf(view.islands) },
      { title: 'Autres villes', data: view.otherCities.map((row) => ({ ...row, indented: false })) },
    ].filter((section) => section.data.length > 0);
  }, [journal, version, countryId]);
  const customCities = useMemo(
    () => journal.cities().filter((city) => city.custom && city.countryId === countryId),
    [journal, version, countryId],
  );
  const within = useMemo(() => ({ countryId, customCities }), [countryId, customCities]);

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

  /** Marks the Place picked Wish, unless it has a Mark already, and says so with an undo. */
  const pick = (picked: Picked) => {
    setAdding(false);
    const place: PlaceRef | City =
      picked.level === 'city'
        ? (journal.city(picked.place.id) ?? cityPlace(picked.place))
        : { level: picked.level, id: picked.place.id };
    // A Place already marked, Visited say, keeps its Mark: it is in the page already.
    const marked = journal.place(place)?.mark != null;
    if (!marked) mark(place, 'wish');
    const message = `${picked.place.name} · ${STATUS_LABEL[journal.status(place)]}`;
    setNotice({ key: Date.now(), message, undoable: !marked });
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
                within={within}
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
        sections={sections}
        keyExtractor={(row: Row) => `${row.place.level}:${row.place.id}`}
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
