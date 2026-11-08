// A Plan in the Wishlist: its Country, its Itinerary in order, its stops and Todos left, and
// its Planned date, which can be set from there. A tap opens the Country's page.
import { MapPin } from 'lucide-react-native';
import type { ReactElement } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { photoUri } from '@/journal/devicePhotoFiles';
import { colors, layout, radius, space, text } from '@/theme/tokens';

import { PlannedDateButton } from './PlannedDateButton';

type Props = {
  countryId: string;
  name: string;
  /** The names of its stops, in the Itinerary's order. */
  stops: readonly string[];
  /** « 3 destinations · 2 à faire » (see planSummary). */
  summary: string;
  plannedDate: string | null;
  /** The file of the Country's Cover photo's thumbnail, if it has one. */
  thumbnail: string | null;
  last?: boolean;
  /** Its grip, when the Plans around it can be reordered. */
  grip?: ReactElement;
  onPress: () => void;
  onShowOnGlobe: () => void;
};

export function PlanRow({ countryId, name, stops, summary, plannedDate, thumbnail, last, grip, onPress, onShowOnGlobe }: Props) {
  const showLabel = `Voir ${name} sur le globe`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityActions={[{ name: 'globe', label: showLabel }]}
      onAccessibilityAction={({ nativeEvent }) => nativeEvent.actionName === 'globe' && onShowOnGlobe()}
      onPress={onPress}
      style={({ pressed }) => [styles.row, last && styles.last, pressed && { backgroundColor: colors.paper2 }]}>
      <View style={styles.thumbnail}>
        {thumbnail && <Image source={{ uri: photoUri(thumbnail) }} style={StyleSheet.absoluteFill} />}
      </View>
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {stops.length > 0 && (
          <Text style={styles.stops} numberOfLines={2}>
            {stops.join(' → ')}
          </Text>
        )}
        <Text style={styles.meta} numberOfLines={1}>
          {summary}
        </Text>
        <View style={styles.date}>
          <PlannedDateButton countryId={countryId} plannedDate={plannedDate} />
        </View>
      </View>
      <IconButton variant="ghost" icon={MapPin} label={showLabel} onPress={onShowOnGlobe} />
      {grip}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    paddingVertical: space[3],
    borderBottomWidth: layout.borderWidth,
    borderBottomColor: colors.borderDefault,
  },
  last: {
    borderBottomWidth: 0,
  },
  // As PlaceRow's: 44 pt square, 4 pt corners.
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.paper2,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...text.bodyStrong,
    color: colors.textPrimary,
  },
  stops: {
    ...text.bodyS,
    color: colors.textSecondary,
  },
  meta: {
    ...text.bodyS,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  date: {
    flexDirection: 'row',
    paddingTop: space[2],
  },
});
