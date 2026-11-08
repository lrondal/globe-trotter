// The Place sheet: a paper sheet over the bottom of the globe, dragged between peek, half and
// full height. Its height is a shared value the Globe writes too, so a tap on a Country opens
// it from the UI thread, before React has rendered its content.
import {
  Bookmark,
  BookmarkMinus,
  CalendarDays,
  Check,
  ChevronLeft,
  Move,
  NotebookPen,
  PenLine,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import {
  Gesture,
  GestureDetector,
  ScrollView,
} from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { Button } from "@/components/Button";
import { MonthDialog } from "@/components/MonthDialog";
import { PlaceRow } from "@/components/PlaceRow";
import { STATUS_LABEL, StatusBadge } from "@/components/StatusBadge";
import { photoUri } from "@/journal/devicePhotoFiles";
import type { Mark, Photo, Status } from "@/journal/journal";
import { PhotoGrid } from "@/photos/PhotoGrid";
import { monthOf, type VisitDates } from "@/journal/visitDate";
import {
  colors,
  duration,
  easing,
  fonts,
  layout,
  radius,
  shadow,
  space,
  text,
} from "@/theme/tokens";

import { formatCoordinates } from "./coordinates";
import { sheetChange, type SheetIdentity } from "./crossfade";
import { detentHeight, restingDetent, sheetTiming } from "./detents";
import { formatVisitDates } from "./visitDate";

export type SheetPlace = SheetIdentity & {
  name: string;
  /** Shown above the name: a Region's Country, which a Region's sheet goes back to. */
  overline?: string;
  lon: number;
  lat: number;
  status: Status;
  /** Names of the Places inside it that its Status comes from, when not from its own Mark. */
  via: string[];
  /** The Visit dates shown in the header, its own or the range of those inside (see Journal.visitDates). */
  visitDates: VisitDates | null;
  /** Its own Visit date, YYYY-MM, which « Changer la date » edits: only a Place marked Visited has one. */
  ownVisitDate: string | null;
  /** Whether « Retirer » is offered (see Journal.canRemoveMark). */
  canRemove: boolean;
  /** « Marquer visitée » for a Region or a City, « Marquer visité » otherwise. */
  feminine?: boolean;
  /** The Place's Note, of which the sheet shows the start; empty when it has none. */
  note: string;
  /** The Journal's Cities inside it, listed under « Villes », with their Cover photo's thumbnail. */
  cities: { id: string; name: string; status: Status; thumbnail: string | null }[];
  /** Its Cover photo, shown at the top; null when it has no Photos, nor the Places inside it. */
  cover: Photo | null;
  /** Its own Photos, in the order they were added. */
  photos: readonly Photo[];
  /** Those of the Places inside it, shown apart, read-only. */
  photosInside: readonly Photo[];
  /** The heading of those: « Dans ce pays », say. */
  insideLabel: string;
  /** A Custom City, which offers « Renommer » and « Déplacer ». */
  custom?: boolean;
};

type Props = {
  /** Points of sheet showing above the bottom of the screen; 0 when closed. */
  height: SharedValue<number>;
  screenHeight: number;
  /** The Place shown; null while the sheet closes. */
  place: SheetPlace | null;
  onClose: () => void;
  /** « ‹ Country », on a Region: back to its Country. */
  onBack: () => void;
  /** Sets the Mark of the Place shown; null is Retirer. */
  onMark: (mark: Mark | null) => void;
  /** A Visit date picked for the Place shown, YYYY-MM. */
  onVisitDate: (visitDate: string) => void;
  /** « Ouvrir le carnet »: opens the Note screen of the Place shown. */
  onOpenNote: () => void;
  /** A City of the list « Villes » tapped. */
  onOpenCity: (id: string) => void;
  /** A Photo tapped, its own or one inside it, to open full screen. */
  onOpenPhoto: (photo: Photo) => void;
  /** « Renommer », on a Custom City. */
  onRename: () => void;
  /** « Déplacer », on a Custom City. */
  onMove: () => void;
};

/** Lines of the Note the sheet shows before cutting it off. */
const EXCERPT_LINES = 3;
/** Places of the provenance named before « … ». */
const VIA_NAMES = 3;

/** The content fades out quickly, then the next Place fades in. */
const fadeEasing = Easing.bezier(...easing.out);
const fadeOut = { duration: duration.fast, easing: fadeEasing };
const fadeIn = { duration: duration.base, easing: fadeEasing };

/** « via Kansai, Kanto, … », or nothing for a Status from the Place's own Mark. */
const formatVia = (names: string[]) =>
  names.length === 0
    ? null
    : `via ${names.slice(0, VIA_NAMES).join(", ")}${names.length > VIA_NAMES ? ", …" : ""}`;

export function PlaceSheet({
  height,
  screenHeight,
  place,
  onClose,
  onBack,
  onMark,
  onVisitDate,
  onOpenNote,
  onOpenCity,
  onOpenPhoto,
  onRename,
  onMove,
}: Props) {
  // The last Place stays on the sheet while it slides away, or while it fades out.
  const [shown, setShown] = useState(place);
  /** The `place` of the last render. */
  const [previous, setPrevious] = useState(place);
  const [fading, setFading] = useState(false);
  if (place !== previous) {
    setPrevious(place);
    const change = sheetChange(previous, place);
    // Fading out, the next Place waits for the content to be gone, whatever it is.
    if (change === "swap" || (change === "update" && !fading)) {
      setShown(place);
      setFading(false);
    } else if (change === "fade") setFading(true);
  }
  const latest = useRef(place);
  useEffect(() => {
    latest.current = place;
  }, [place]);
  // Closed while fading out, the sheet slides away empty: the next one opening shows its Place.
  const reveal = useCallback(() => {
    if (!latest.current) return;
    setShown(latest.current);
    setFading(false);
  }, []);
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (fading)
      opacity.value = withTiming(
        0,
        fadeOut,
        (done) => done && scheduleOnRN(reveal),
      );
    else opacity.value = withTiming(1, fadeIn);
  }, [fading, shown, opacity, reveal]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const [picking, setPicking] = useState(false);

  const full = detentHeight("full", screenHeight);
  const drag = Gesture.Pan()
    .onBegin(() => {
      cancelAnimation(height);
    })
    .onChange((e) => {
      height.value = Math.max(0, Math.min(full, height.value - e.changeY));
    })
    .onEnd((e) => {
      const detent = restingDetent(height.value, -e.velocityY, screenHeight);
      if (detent)
        height.value = withTiming(
          detentHeight(detent, screenHeight),
          sheetTiming,
        );
      else scheduleOnRN(onClose);
    });

  const slide = useAnimatedStyle(() => ({
    // Closed, it also hides its shadow below the screen.
    transform: [
      { translateY: full - height.value + (height.value <= 0 ? 48 : 0) },
    ],
  }));

  return (
    <Animated.View style={[styles.sheet, { height: full }, slide]}>
      <GestureDetector gesture={drag}>
        <View style={styles.grip}>
          <View style={styles.handle} />
          {shown && (
            <View style={styles.header}>
              <Animated.View style={[styles.titles, fade]}>
                {shown.overline &&
                  (shown.ref.level === "region" ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Revenir à ${shown.overline}`}
                      onPress={onBack}
                      style={({ pressed }) => [
                        styles.back,
                        pressed && { backgroundColor: colors.paper2 },
                      ]}
                    >
                      <ChevronLeft
                        color={colors.textMuted}
                        size={14}
                        strokeWidth={2}
                      />
                      <Text style={styles.overline}>{shown.overline}</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.overline}>{shown.overline}</Text>
                  ))}
                <Text style={styles.title} numberOfLines={2}>
                  {shown.name}
                </Text>
                <View style={styles.status}>
                  <StatusBadge status={shown.status} />
                  {formatVia(shown.via) && (
                    <Text style={styles.via}>{formatVia(shown.via)}</Text>
                  )}
                  <Text style={styles.meta}>
                    {[
                      shown.visitDates && formatVisitDates(shown.visitDates),
                      formatCoordinates(shown.lon, shown.lat),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
              </Animated.View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fermer"
                onPress={onClose}
                hitSlop={4}
                style={({ pressed }) => [
                  styles.close,
                  pressed && { backgroundColor: colors.paper2 },
                ]}
              >
                <X color={colors.textPrimary} size={18} strokeWidth={2} />
              </Pressable>
            </View>
          )}
        </View>
      </GestureDetector>
      {shown && (
        // Fading out, its buttons would act on the next Place already.
        <Animated.View
          style={[styles.content, fade]}
          pointerEvents={fading ? "none" : "auto"}
        >
          <ScrollView contentContainerStyle={styles.body}>
            {shown.cover && (
              <Pressable
                accessibilityRole="imagebutton"
                accessibilityLabel="Cover photo"
                onPress={() => shown.cover && onOpenPhoto(shown.cover)}
                style={styles.cover}
              >
                <Image
                  source={{ uri: photoUri(shown.cover.file) }}
                  style={StyleSheet.absoluteFill}
                />
              </Pressable>
            )}
            <MarkActions
              status={shown.status}
              canRemove={shown.canRemove}
              feminine={shown.feminine}
              onMark={onMark}
              onEditDate={
                shown.ownVisitDate ? () => setPicking(true) : undefined
              }
            />
            {shown.note !== "" && (
              <Text style={styles.excerpt} numberOfLines={EXCERPT_LINES}>
                « {shown.note.trim()} »
              </Text>
            )}
            {/* For every Status: a Note or Todos can be written before marking the Place. */}
            <Button
              variant="secondary"
              icon={NotebookPen}
              fullWidth
              onPress={onOpenNote}
            >
              Ouvrir le carnet
            </Button>
            {shown.custom && (
              <View style={styles.actions}>
                <Button
                  variant="secondary"
                  icon={PenLine}
                  onPress={onRename}
                  style={styles.action}
                >
                  Renommer
                </Button>
                <Button
                  variant="secondary"
                  icon={Move}
                  onPress={onMove}
                  style={styles.action}
                >
                  Déplacer
                </Button>
              </View>
            )}
            {shown.photos.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.overline}>Photos</Text>
                <PhotoGrid photos={shown.photos} onOpen={onOpenPhoto} />
              </View>
            )}
            {shown.photosInside.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.overline}>{shown.insideLabel}</Text>
                <PhotoGrid photos={shown.photosInside} onOpen={onOpenPhoto} />
              </View>
            )}
            {shown.cities.length > 0 && (
              <View>
                <Text style={styles.overline}>Villes</Text>
                {shown.cities.map((city, i) => (
                  <PlaceRow
                    key={city.id}
                    name={city.name}
                    meta={STATUS_LABEL[city.status]}
                    status={city.status}
                    thumbnail={city.thumbnail}
                    last={i === shown.cities.length - 1}
                    onPress={() => onOpenCity(city.id)}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        </Animated.View>
      )}
      {shown?.ownVisitDate && (
        <MonthDialog
          open={picking}
          initial={shown.ownVisitDate}
          latest={monthOf(new Date())}
          onConfirm={(visitDate) => {
            setPicking(false);
            onVisitDate(visitDate);
          }}
          onCancel={() => setPicking(false)}
        />
      )}
    </Animated.View>
  );
}

/**
 * « Marquer visité » and « À visiter » / « Retirer », as the Place's Status allows. A Status
 * the Place only inherits offers no « Retirer »: there is no Mark of its own to take back,
 * nor a Visit date of its own to change.
 */
function MarkActions({
  status,
  canRemove,
  feminine,
  onMark,
  onEditDate,
}: {
  status: Status;
  canRemove: boolean;
  feminine?: boolean;
  onMark: (mark: Mark | null) => void;
  /** « Changer la date », on a Place marked Visited. */
  onEditDate?: () => void;
}) {
  if (status === "visited") {
    if (!canRemove) return null;
    return (
      <View style={styles.actions}>
        {onEditDate && (
          <Button
            variant="secondary"
            icon={CalendarDays}
            onPress={onEditDate}
            style={styles.action}
          >
            Changer la date
          </Button>
        )}
        <Button
          variant="secondary"
          icon={X}
          onPress={() => onMark(null)}
          style={styles.action}
        >
          Retirer
        </Button>
      </View>
    );
  }
  return (
    <View style={styles.actions}>
      <Button
        variant="accent"
        icon={Check}
        onPress={() => onMark("visited")}
        style={styles.action}
      >
        {feminine ? "Marquer visitée" : "Marquer visité"}
      </Button>
      {status === "wish" ? (
        canRemove && (
          <Button
            variant="secondary"
            icon={BookmarkMinus}
            onPress={() => onMark(null)}
            style={styles.action}
          >
            Retirer
          </Button>
        )
      ) : (
        <Button
          variant="secondary"
          icon={Bookmark}
          onPress={() => onMark("wish")}
          style={styles.action}
        >
          À visiter
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
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
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    marginTop: space[3],
    marginBottom: space[2],
    backgroundColor: colors.paper4,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space[4],
    paddingHorizontal: layout.screenGutter,
    paddingTop: space[2],
  },
  titles: {
    flex: 1,
    gap: space[3],
  },
  // The overline as a button: 44 pt tall to the finger, laid out as tall as the overline.
  back: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 2,
    minHeight: layout.hitMin,
    marginVertical: -(layout.hitMin - text.overline.lineHeight) / 2,
    paddingLeft: space[2],
    paddingRight: space[3],
    marginLeft: -space[2],
    borderRadius: radius.pill,
  },
  // 11 pt, uppercase, +0.08 em.
  overline: {
    ...text.overline,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 11 * 0.08,
  },
  title: {
    ...text.displayL,
    color: colors.textPrimary,
    letterSpacing: 34 * -0.01,
  },
  status: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  via: {
    ...text.caption,
    color: colors.textSecondary,
  },
  meta: {
    ...text.caption,
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
  },
  content: {
    flex: 1,
  },
  body: {
    gap: 18,
    paddingHorizontal: layout.screenGutter,
    paddingBottom: space[8],
  },
  // 16:10, 6 pt corners.
  cover: {
    aspectRatio: 16 / 10,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.paper2,
  },
  section: {
    gap: space[3],
  },
  actions: {
    flexDirection: "row",
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
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: layout.borderWidth,
    borderColor: colors.borderStrong,
  },
});
