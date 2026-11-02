// A grid of Photos' thumbnails, as the design system's Note lays them out: 3 columns, 4 pt
// apart, 2 pt corners. A tap opens one full screen.
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import type { Photo } from '@/journal/journal';
import { photoUri } from '@/journal/devicePhotoFiles';
import { colors, radius } from '@/theme/tokens';

const COLUMNS = 3;
const GAP = 4;

type Props = {
  photos: readonly Photo[];
  onOpen: (photo: Photo) => void;
};

export function PhotoGrid({ photos, onOpen }: Props) {
  const [width, setWidth] = useState(0);
  const side = (width - GAP * (COLUMNS - 1)) / COLUMNS;
  return (
    <View style={styles.grid} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 &&
        photos.map((photo, i) => (
          <Pressable
            key={photo.id}
            accessibilityRole="imagebutton"
            accessibilityLabel={photo.caption || `Photo ${i + 1} sur ${photos.length}`}
            onPress={() => onOpen(photo)}
            style={({ pressed }) => [styles.tile, { width: side, height: side }, pressed && styles.pressed]}>
            <Image source={{ uri: photoUri(photo.thumbnail) }} style={StyleSheet.absoluteFill} />
          </Pressable>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  tile: {
    borderRadius: radius.xs,
    overflow: 'hidden',
    backgroundColor: colors.paper2,
  },
  pressed: {
    opacity: 0.8,
  },
});
