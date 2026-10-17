// Dev-only measure panel, to check on the iPhone that the globe holds 60 fps (#1 R2, R5).
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius } from '@/theme/tokens';

import { DETAIL, type Detail } from './projection';

export type Measures = {
  /** Frames per second while the globe moves. */
  fps: number;
  /** UI-thread time to project the Countries, per moving frame. */
  msPerFrame: number;
  /** Longest moving frame: a dropped frame shows as 33 ms or more. */
  worstFrameMs: number;
  /** Points drawn in the last frame. */
  points: number;
  zoom: number;
};

const DETAIL_LABELS: Record<Detail, string> = { fine: 'fin', standard: 'standard', light: 'léger' };

type Props = {
  measures: Measures;
  detail: Detail;
  onDetail: (detail: Detail) => void;
  onClose: () => void;
};

export function MeasurePanel({ measures: m, detail, onDetail, onClose }: Props) {
  return (
    <View style={styles.panel}>
      <Pressable onPress={onClose} accessibilityRole="button">
        <Text style={styles.title}>
          {Math.round(m.fps)} fps · {m.msPerFrame.toFixed(1)} ms/img · pire {Math.round(m.worstFrameMs)} ms ▾
        </Text>
        <Text style={styles.text}>
          {m.points} points · zoom {m.zoom.toFixed(1)} · mesuré pendant le mouvement
        </Text>
      </Pressable>
      <View style={styles.row}>
        <Text style={styles.text}>Détail</Text>
        {(Object.keys(DETAIL) as Detail[]).map((d) => (
          <Pressable key={d} onPress={() => onDetail(d)} style={[styles.chip, d === detail && styles.chipOn]}>
            <Text style={[styles.chipText, d === detail && styles.chipTextOn]}>{DETAIL_LABELS[d]}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(27,26,23,0.82)',
    borderRadius: radius.lg,
    padding: 8,
  },
  title: {
    color: colors.textInverse,
    fontFamily: fonts.sansSemibold,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  text: {
    color: colors.paper3,
    fontFamily: fonts.sansRegular,
    fontSize: 11,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.ink3,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipOn: {
    backgroundColor: colors.paper0,
    borderColor: colors.paper0,
  },
  chipText: {
    color: colors.paper3,
    fontFamily: fonts.sansMedium,
    fontSize: 11,
  },
  chipTextOn: {
    color: colors.textPrimary,
  },
});
