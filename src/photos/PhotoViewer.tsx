// A Photo full screen: swiped to the next of its Place's, pinched to zoom, its Caption written
// at the bottom, chosen as Cover photo, or deleted after a Dialog. The Photos of the Places
// inside a Place are shown as they are: only their Place's Note edits or deletes them.
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Star, Trash2, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { photoUri } from '@/journal/devicePhotoFiles';
import { CAPTION_MAX, type Photo, type PlaceRef } from '@/journal/journal';
import { useJournal } from '@/journal/JournalProvider';
import { colors, duration, layout, radius, space, text } from '@/theme/tokens';

/** The most a Photo zooms in, and how far a double tap takes it. */
const MAX_ZOOM = 4;
const DOUBLE_TAP_ZOOM = 2.5;

type Props = {
  place: PlaceRef;
  /** The id of the Photo it opens on. */
  first: number;
  /** Among the Photos of the Places inside `place`, rather than its own. */
  inside: boolean;
};

export function PhotoViewer({ place, first, inside }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { journal, setCaption, setCoverPhoto, deletePhoto } = useJournal();
  const photos = inside ? journal.photosInside(place) : journal.photos(place);
  const [index, setIndex] = useState(() => Math.max(0, photos.findIndex((p) => p.id === first)));
  const [zoomed, setZoomed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const shown: Photo | undefined = photos[Math.min(index, photos.length - 1)];
  const cover = journal.coverPhoto(place);

  // The last Photo deleted, there is nothing left to show.
  useEffect(() => {
    if (photos.length === 0) router.back();
  }, [photos.length]);
  if (!shown) return null;

  const onDelete = () => {
    setDeleting(false);
    deletePhoto(shown.id);
    // The next Photo slides into its place; the last one gives way to the one before.
    setIndex((i) => Math.min(i, photos.length - 2));
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <StatusBar style="light" />
      <FlatList
        data={photos}
        keyExtractor={(photo) => String(photo.id)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        // While zoomed in, a drag moves the Photo rather than swiping to the next.
        scrollEnabled={!zoomed}
        initialScrollIndex={index}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => <ZoomablePhoto photo={item} width={width} onZoomed={setZoomed} />}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.topBar, { paddingTop: insets.top }]} pointerEvents="box-none">
        <DarkButton icon={X} label="Fermer" onPress={() => router.back()} />
        <Text style={styles.counter}>
          {index + 1} / {photos.length}
        </Text>
        {inside ? <View style={styles.spacer} /> : <DarkButton icon={Trash2} label="Supprimer" onPress={() => setDeleting(true)} />}
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + space[3] }]}>
        {inside ? (
          shown.caption !== '' && <Text style={styles.caption}>{shown.caption}</Text>
        ) : (
          // Keyed by Photo: each one starts from its own Caption.
          <CaptionInput key={shown.id} caption={shown.caption} onChange={(caption) => setCaption(shown.id, caption)} />
        )}
        <Pressable
          accessibilityRole="button"
          disabled={cover?.id === shown.id}
          onPress={() => setCoverPhoto(place, shown.id)}
          style={({ pressed }) => [styles.coverButton, pressed && styles.pressed]}>
          <Star
            color={colors.textInverse}
            fill={cover?.id === shown.id ? colors.textInverse : 'transparent'}
            size={16}
            strokeWidth={2}
          />
          <Text style={styles.coverText}>{cover?.id === shown.id ? 'Cover photo' : 'Définir comme Cover photo'}</Text>
        </Pressable>
      </View>

      <ConfirmDialog
        open={deleting}
        title="Supprimer la photo ?"
        body="Elle sera supprimée de Globe trotter. Votre pellicule n’est pas touchée."
        confirm="Supprimer"
        onConfirm={onDelete}
        onCancel={() => setDeleting(false)}
      />
    </KeyboardAvoidingView>
  );
}

/** One line, written to the Journal when the typing ends; blank space alone is no Caption. */
function CaptionInput({ caption, onChange }: { caption: string; onChange: (caption: string) => void }) {
  const [draft, setDraft] = useState(caption);
  const saved = useRef(caption);
  const save = () => {
    const next = draft.trim();
    if (next !== saved.current) onChange(next);
    saved.current = next;
  };
  // Swiped to the next Photo with the keyboard up, the Caption typed is kept.
  const latest = useRef(save);
  useEffect(() => {
    latest.current = save;
  });
  useEffect(() => () => latest.current(), []);
  return (
    <TextInput
      value={draft}
      onChangeText={setDraft}
      onEndEditing={save}
      maxLength={CAPTION_MAX}
      returnKeyType="done"
      placeholder="Ajouter une légende"
      placeholderTextColor="rgba(251,249,244,0.6)"
      accessibilityLabel="Légende"
      style={styles.captionInput}
    />
  );
}

/** A Photo filling the screen's width, pinched to zoom, dragged around once zoomed in, double-tapped in and out. */
function ZoomablePhoto({ photo, width, onZoomed }: { photo: Photo; width: number; onZoomed: (zoomed: boolean) => void }) {
  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const start = useSharedValue({ x: 0, y: 0 });
  const [zoomed, setZoomed] = useState(false);
  const report = (next: boolean) => {
    setZoomed(next);
    onZoomed(next);
  };
  const timing = { duration: duration.base };
  const reset = () => {
    'worklet';
    scale.value = withTiming(1, timing);
    x.value = withTiming(0, timing);
    y.value = withTiming(0, timing);
    scheduleOnRN(report, false);
  };

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.max(0.8, Math.min(MAX_ZOOM, startScale.value * e.scale));
    })
    .onEnd(() => {
      if (scale.value <= 1) reset();
      else scheduleOnRN(report, true);
    });
  // Only zoomed in: otherwise the drag swipes to the next Photo.
  const pan = Gesture.Pan()
    .enabled(zoomed)
    .averageTouches(true)
    .onStart(() => {
      start.value = { x: x.value, y: y.value };
    })
    .onUpdate((e) => {
      x.value = start.value.x + e.translationX;
      y.value = start.value.y + e.translationY;
    });
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((_, success) => {
      if (!success) return;
      if (scale.value > 1) {
        reset();
        return;
      }
      scale.value = withTiming(DOUBLE_TAP_ZOOM, timing);
      scheduleOnRN(report, true);
    });
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
      <View style={[styles.page, { width }]}>
        <Animated.View style={[StyleSheet.absoluteFill, style]}>
          <Image
            source={{ uri: photoUri(photo.file) }}
            resizeMode="contain"
            style={StyleSheet.absoluteFill}
            accessibilityLabel={photo.caption || 'Photo'}
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

function DarkButton({ icon: Icon, label, onPress }: { icon: typeof X; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.darkButton, pressed && styles.pressed]}>
      <Icon color={colors.textInverse} size={22} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surfaceInverse,
  },
  page: {
    flex: 1,
    overflow: 'hidden',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
  },
  counter: {
    ...text.label,
    color: colors.textInverse,
    fontVariant: ['tabular-nums'],
  },
  spacer: {
    width: layout.hitMin,
  },
  darkButton: {
    width: layout.hitMin,
    height: layout.hitMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  pressed: {
    backgroundColor: 'rgba(251,249,244,0.16)',
  },
  // Over the bottom of the Photo, on the design system's caption gradient, made solid.
  bottom: {
    marginTop: 'auto',
    gap: space[3],
    paddingTop: space[5],
    paddingHorizontal: layout.screenGutter,
    backgroundColor: 'rgba(27,26,23,0.55)',
  },
  caption: {
    ...text.body,
    color: colors.textInverse,
  },
  captionInput: {
    ...text.body,
    minHeight: layout.hitMin,
    color: colors.textInverse,
  },
  coverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space[3],
    minHeight: layout.hitMin,
    paddingHorizontal: space[4],
    marginLeft: -space[4],
    borderRadius: radius.pill,
  },
  coverText: {
    ...text.label,
    color: colors.textInverse,
  },
});
