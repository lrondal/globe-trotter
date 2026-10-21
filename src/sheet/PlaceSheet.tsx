// The Place sheet: a paper sheet over the bottom of the globe, dragged between peek, half and
// full height. Its height is a shared value the Globe writes too, so a tap on a Country opens
// it from the UI thread, before React has rendered its content.
import { Bookmark, BookmarkMinus, Check, ChevronRight, NotebookPen, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, useAnimatedStyle, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Button } from '@/components/Button';
import { STATUS_LABEL, StatusBadge } from '@/components/StatusBadge';
import type { Mark, Status } from '@/journal/journal';
import { colors, fonts, layout, radius, shadow, space, text } from '@/theme/tokens';

import { formatCoordinates } from './coordinates';
import { detentHeight, restingDetent, sheetTiming } from './detents';

export type SheetPlace = {
  name: string;
  /** Shown above the name: a Region's Country. */
  overline?: string;
  lon: number;
  lat: number;
  status: Status;
  /** Names of the Places inside it that its Status comes from, when not from its own Mark. */
  via: string[];
  /** Whether « Retirer » is offered (see Journal.canRemoveMark). */
  canRemove: boolean;
  /** « Marquer visitée » for a Region or a City, « Marquer visité » otherwise. */
  feminine?: boolean;
  /** The Place's Note, of which the sheet shows the start; empty when it has none. */
  note: string;
  /** The Journal's Cities inside it, listed under « Villes ». */
  cities: { id: string; name: string; status: Status }[];
};

type Props = {
  /** Points of sheet showing above the bottom of the screen; 0 when closed. */
  height: SharedValue<number>;
  screenHeight: number;
  /** The Place shown; null while the sheet closes. */
  place: SheetPlace | null;
  onClose: () => void;
  /** Sets the Mark of the Place shown; null is Retirer. */
  onMark: (mark: Mark | null) => void;
  /** « Ouvrir le carnet »: opens the Note screen of the Place shown. */
  onOpenNote: () => void;
  /** A City of the list « Villes » tapped. */
  onOpenCity: (id: string) => void;
};

/** Lines of the Note the sheet shows before cutting it off. */
const EXCERPT_LINES = 3;
/** Places of the provenance named before « … ». */
const VIA_NAMES = 3;

/** The status dot of a row: an unexplored one is hollow. */
const DOT: Record<Status, object> = {
  visited: { backgroundColor: colors.stateVisited },
  wish: { backgroundColor: colors.stateWish },
  unexplored: { borderWidth: layout.borderWidth, borderColor: colors.ink3 },
};

/** « via Kansai, Kanto, … », or nothing for a Status from the Place's own Mark. */
const formatVia = (names: string[]) =>
  names.length === 0 ? null : `via ${names.slice(0, VIA_NAMES).join(', ')}${names.length > VIA_NAMES ? ', …' : ''}`;

export function PlaceSheet({ height, screenHeight, place, onClose, onMark, onOpenNote, onOpenCity }: Props) {
  // The last Place stays on the sheet while it slides away.
  const [shown, setShown] = useState(place);
  if (place && place !== shown) setShown(place);

  const full = detentHeight('full', screenHeight);
  const drag = Gesture.Pan()
    .onBegin(() => {
      cancelAnimation(height);
    })
    .onChange((e) => {
      height.value = Math.max(0, Math.min(full, height.value - e.changeY));
    })
    .onEnd((e) => {
      const detent = restingDetent(height.value, -e.velocityY, screenHeight);
      if (detent) height.value = withTiming(detentHeight(detent, screenHeight), sheetTiming);
      else scheduleOnRN(onClose);
    });

  const slide = useAnimatedStyle(() => ({
    // Closed, it also hides its shadow below the screen.
    transform: [{ translateY: full - height.value + (height.value <= 0 ? 48 : 0) }],
  }));

  return (
    <Animated.View style={[styles.sheet, { height: full }, slide]}>
      <GestureDetector gesture={drag}>
        <View style={styles.grip}>
          <View style={styles.handle} />
          {shown && (
            <View style={styles.header}>
              <View style={styles.titles}>
                {shown.overline && <Text style={styles.overline}>{shown.overline}</Text>}
                <Text style={styles.title} numberOfLines={2}>
                  {shown.name}
                </Text>
                <View style={styles.status}>
                  <StatusBadge status={shown.status} />
                  {formatVia(shown.via) && <Text style={styles.via}>{formatVia(shown.via)}</Text>}
                  <Text style={styles.meta}>{formatCoordinates(shown.lon, shown.lat)}</Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fermer"
                onPress={onClose}
                hitSlop={4}
                style={({ pressed }) => [styles.close, pressed && { backgroundColor: colors.paper2 }]}>
                <X color={colors.textPrimary} size={18} strokeWidth={2} />
              </Pressable>
            </View>
          )}
        </View>
      </GestureDetector>
      {shown && (
        <ScrollView contentContainerStyle={styles.body}>
          <MarkActions status={shown.status} canRemove={shown.canRemove} feminine={shown.feminine} onMark={onMark} />
          {shown.note !== '' && (
            <Text style={styles.excerpt} numberOfLines={EXCERPT_LINES}>
              « {shown.note.trim()} »
            </Text>
          )}
          {/* For every Status: a Note or Todos can be written before marking the Place. */}
          <Button variant="secondary" icon={NotebookPen} fullWidth onPress={onOpenNote}>
            Ouvrir le carnet
          </Button>
          {shown.cities.length > 0 && (
            <View>
              <Text style={styles.overline}>Villes</Text>
              {shown.cities.map((city, i) => (
                <Pressable
                  key={city.id}
                  accessibilityRole="button"
                  onPress={() => onOpenCity(city.id)}
                  style={({ pressed }) => [
                    styles.cityRow,
                    i === shown.cities.length - 1 && styles.lastRow,
                    pressed && { backgroundColor: colors.paper2 },
                  ]}>
                  <View style={styles.cityText}>
                    <Text style={styles.cityName} numberOfLines={1}>
                      {city.name}
                    </Text>
                    <Text style={styles.cityMeta}>{STATUS_LABEL[city.status]}</Text>
                  </View>
                  <View style={[styles.dot, DOT[city.status]]} />
                  <ChevronRight color={colors.ink4} size={18} strokeWidth={2} />
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </Animated.View>
  );
}

/**
 * « Marquer visité » and « À visiter » / « Retirer », as the Place's Status allows. A Status
 * the Place only inherits offers no « Retirer »: there is no Mark of its own to take back.
 */
function MarkActions({
  status,
  canRemove,
  feminine,
  onMark,
}: {
  status: Status;
  canRemove: boolean;
  feminine?: boolean;
  onMark: (mark: Mark | null) => void;
}) {
  if (status === 'visited') {
    if (!canRemove) return null;
    return (
      <View style={styles.actions}>
        <Button variant="secondary" icon={X} onPress={() => onMark(null)} style={styles.action}>
          Retirer
        </Button>
      </View>
    );
  }
  return (
    <View style={styles.actions}>
      <Button variant="accent" icon={Check} onPress={() => onMark('visited')} style={styles.action}>
        {feminine ? 'Marquer visitée' : 'Marquer visité'}
      </Button>
      {status === 'wish' ? (
        canRemove && (
          <Button variant="secondary" icon={BookmarkMinus} onPress={() => onMark(null)} style={styles.action}>
            Retirer
          </Button>
        )
      ) : (
        <Button variant="secondary" icon={Bookmark} onPress={() => onMark('wish')} style={styles.action}>
          À visiter
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    boxShadow: shadow.sheet,
  },
  grip: {
    paddingBottom: space[4],
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginTop: space[3],
    marginBottom: space[2],
    backgroundColor: colors.paper4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[4],
    paddingHorizontal: layout.screenGutter,
    paddingTop: space[2],
  },
  titles: {
    flex: 1,
    gap: space[3],
  },
  // 11 pt, uppercase, +0.08 em.
  overline: {
    ...text.overline,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 11 * 0.08,
  },
  title: {
    ...text.displayL,
    color: colors.textPrimary,
    letterSpacing: 34 * -0.01,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  via: {
    ...text.caption,
    color: colors.textSecondary,
  },
  meta: {
    ...text.caption,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  body: {
    gap: 18,
    paddingHorizontal: layout.screenGutter,
    paddingBottom: space[8],
  },
  // The design system's PlaceRow, without a thumbnail until Photos come (#12).
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
    minHeight: 56,
    paddingVertical: space[3],
    borderBottomWidth: layout.borderWidth,
    borderBottomColor: colors.borderDefault,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  cityText: {
    flex: 1,
    gap: 2,
  },
  cityName: {
    ...text.bodyStrong,
    color: colors.textPrimary,
  },
  cityMeta: {
    ...text.bodyS,
    color: colors.textMuted,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  // Instrument Serif italic 20/1.3, inside « ».
  excerpt: {
    fontFamily: fonts.displayItalic,
    fontSize: 20,
    lineHeight: 26,
    color: colors.textPrimary,
  },
  action: {
    flex: 1,
  },
  // The design system's outline icon button, small size.
  close: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: layout.borderWidth,
    borderColor: colors.borderStrong,
  },
});
