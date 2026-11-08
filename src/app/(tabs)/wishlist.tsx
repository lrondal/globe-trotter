// The Wishlist view (« Envies »): the Plans as a timeline, « Prochainement », then each later
// year, then « Un jour » (see planTimeline); the Plans of a year or of « Un jour » reordered by
// dragging. Each shows its Itinerary, its stops and Todos left, and its Planned date, set from
// there. « + » searches every Place, and marks Wish the one picked. A Plan opens its Country's
// page; its map pin flies the globe there.
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useMemo, useRef, useState, type ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
// The legacy one: DragList's drag blocks it, a relation the hook-based ScrollView of v3 cannot take.
import { LegacyScrollView as ScrollView } from 'react-native-gesture-handler';

import { Button } from '@/components/Button';
import { DragList } from '@/components/DragList';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { ListScreen } from '@/components/ListScreen';
import { Toast } from '@/components/Toast';
import { useShowOnGlobe } from '@/globe/ShowOnGlobeProvider';
import type { PlaceRef } from '@/journal/journal';
import { useJournal } from '@/journal/JournalProvider';
import { placeName } from '@/journal/placeName';
import { planSummary, planTimeline, type PlanGroup } from '@/journal/view';
import { monthOf } from '@/journal/visitDate';
import { moved } from '@/note/reorder';
import { PlanRow } from '@/plans/PlanRow';
import { SearchBar } from '@/search/SearchBar';
import { useWishPick } from '@/search/useWishPick';
import { colors, space, text } from '@/theme/tokens';

/** A Plan as its row shows it. */
type PlanItem = {
  countryId: string;
  plannedDate: string | null;
  name: string;
  stops: string[];
  summary: string;
  thumbnail: string | null;
};

export default function WishlistScreen() {
  const { journal, version, undo, orderPlans } = useJournal();
  const { show } = useShowOnGlobe();
  const [adding, setAdding] = useState(false);
  const { pick: wishPicked, notice, hideNotice } = useWishPick();
  const scroll = useRef<ScrollView>(null);

  // Read anew after every change to the Journal.
  const groups = useMemo((): PlanGroup<PlanItem>[] => {
    const nameOf = (place: PlaceRef) => placeName(journal, place);
    const plans = journal.plans().map(({ countryId, plannedDate }): PlanItem => {
      const country = { level: 'country', id: countryId } as const;
      const stops = journal.itinerary(countryId);
      const todosLeft = [country, ...stops].flatMap((place) => journal.todos(place)).filter((todo) => !todo.done).length;
      return {
        countryId,
        plannedDate,
        name: nameOf(country),
        stops: stops.map(nameOf),
        summary: planSummary(stops.length, todosLeft),
        thumbnail: journal.coverPhoto(country)?.thumbnail ?? null,
      };
    });
    return planTimeline(plans, monthOf(new Date()));
  }, [journal, version]);
  const count = groups.reduce((n, group) => n + group.plans.length, 0);

  const customCities = useMemo(() => journal.cities().filter((city) => city.custom), [journal, version]);

  const pick: typeof wishPicked = (picked) => {
    setAdding(false);
    wishPicked(picked);
  };

  /** The globe screen, kept mounted under this one, flies there and selects it. */
  const showOnGlobe = (countryId: string) => {
    show({ level: 'country', id: countryId });
    router.navigate('/');
  };
  const openCountryPage = (countryId: string) => router.push({ pathname: '/country/[id]', params: { id: countryId } });

  /** The Plan `countryId` of `group` dropped at `to`: the group's Plans take their new order. */
  const move = (group: PlanGroup<PlanItem>, countryId: string, to: number) => {
    const ids = group.plans.map((plan) => plan.countryId);
    orderPlans(moved(ids, ids.indexOf(countryId), to));
  };

  const row = (plan: PlanItem, last: boolean, grip?: ReactElement) => (
    <PlanRow
      countryId={plan.countryId}
      name={plan.name}
      stops={plan.stops}
      summary={plan.summary}
      plannedDate={plan.plannedDate}
      thumbnail={plan.thumbnail}
      last={last}
      grip={grip}
      onPress={() => openCountryPage(plan.countryId)}
      onShowOnGlobe={() => showOnGlobe(plan.countryId)}
    />
  );

  const add = !adding && count > 0 && (
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
      {count === 0 ? (
        !adding && (
          <EmptyState message="Aucune envie pour l’instant.">
            <Button variant="secondary" icon={Plus} onPress={() => setAdding(true)}>
              Ajouter une envie
            </Button>
          </EmptyState>
        )
      ) : (
        <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
          <Text style={styles.count}>{`${count} projet${count > 1 ? 's' : ''}`}</Text>
          {groups.map((group) => (
            <View key={group.title}>
              <Text accessibilityRole="header" style={styles.groupTitle}>
                {group.title}
              </Text>
              {group.reorderable && group.plans.length > 1 ? (
                <DragList
                  items={group.plans}
                  keyOf={(plan) => plan.countryId}
                  gripLabel={(plan) => `Déplacer ${plan.name}`}
                  onMove={(countryId, to) => move(group, countryId, to)}
                  scroll={scroll}
                  renderItem={(plan, grip, index) => row(plan, index === group.plans.length - 1, grip)}
                />
              ) : (
                group.plans.map((plan, index) => (
                  <View key={plan.countryId}>{row(plan, index === group.plans.length - 1)}</View>
                ))
              )}
            </View>
          ))}
        </ScrollView>
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
  },
  // 11 pt, uppercase, +0.08 em, as the Country page's sections.
  groupTitle: {
    ...text.overline,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 11 * 0.08,
    marginTop: space[5],
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
