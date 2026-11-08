// The design system's Dialog holding a month and year picker: asks for a Visit date, or a
// Planned date.
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { MONTHS, visitDateOf, yearMonthOf } from '@/journal/visitDate';
import { colors, layout, radius, shadow, text } from '@/theme/tokens';

import { Button } from './Button';

type Props = {
  /** Shown while true; the month picked starts over at `initial` each time it opens. */
  open: boolean;
  /** The YYYY-MM month it opens on. */
  initial: string;
  /** The last month that can be picked, YYYY-MM: the current one for a Visit date. None if omitted. */
  latest?: string;
  /** « Date de la visite » unless given. */
  title?: string;
  /** Called with the month picked, YYYY-MM. */
  onConfirm: (month: string) => void;
  onCancel: () => void;
  /** Offers to pick no month at all, under this label: « Un jour », say. */
  clear?: { label: string; onPress: () => void };
};

/** The earliest year offered: a Visit date is written with four digits. */
const FIRST_YEAR = 1900;

/** « janv. », « févr. »…: the months as short as French writes them, for the grid. */
const SHORT_MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** The latest year offered without a `latest` month: a date is written with four digits. */
const LAST_YEAR = 9999;

export function MonthDialog({ open, initial, latest, title = 'Date de la visite', onConfirm, onCancel, clear }: Props) {
  const [picked, setPicked] = useState(() => yearMonthOf(initial));
  // Each opening starts from `initial`, not from what was picked last time.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setPicked(yearMonthOf(initial));
  }
  const last = latest ? yearMonthOf(latest) : { year: LAST_YEAR, month: 12 };
  /** A year stepped to keeps its month, brought back to the latest when it would be to come. */
  const stepYear = (by: number) =>
    setPicked(({ year, month }) => {
      const next = year + by;
      return { year: next, month: next === last.year ? Math.min(month, last.month) : month };
    });

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.scrim}>
        {/* A tap beside the dialog cancels it. */}
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Annuler" onPress={onCancel} />
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.year}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Année précédente"
              disabled={picked.year <= FIRST_YEAR}
              onPress={() => stepYear(-1)}
              style={({ pressed }) => [styles.step, pressed && { backgroundColor: colors.paper2 }]}>
              <ChevronLeft
                color={picked.year <= FIRST_YEAR ? colors.textDisabled : colors.textPrimary}
                size={18}
                strokeWidth={2}
              />
            </Pressable>
            <Text style={styles.yearText}>{picked.year}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Année suivante"
              disabled={picked.year >= last.year}
              onPress={() => stepYear(1)}
              style={({ pressed }) => [styles.step, pressed && { backgroundColor: colors.paper2 }]}>
              <ChevronRight
                color={picked.year >= last.year ? colors.textDisabled : colors.textPrimary}
                size={18}
                strokeWidth={2}
              />
            </Pressable>
          </View>
          <View style={styles.months}>
            {SHORT_MONTHS.map((label, i) => {
              const month = i + 1;
              const toCome = picked.year === last.year && month > last.month;
              const selected = month === picked.month;
              return (
                <Pressable
                  key={label}
                  accessibilityRole="button"
                  accessibilityLabel={`${MONTHS[i]} ${picked.year}`}
                  accessibilityState={{ selected, disabled: toCome }}
                  disabled={toCome}
                  onPress={() => setPicked(({ year }) => ({ year, month }))}
                  style={({ pressed }) => [
                    styles.month,
                    pressed && { backgroundColor: colors.paper2 },
                    selected && styles.selected,
                  ]}>
                  <Text
                    style={[
                      styles.monthText,
                      toCome && { color: colors.textDisabled },
                      selected && { color: colors.textInverse },
                    ]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.actions}>
            {clear && (
              <View style={styles.clear}>
                <Button variant="ghost" size="sm" onPress={clear.onPress}>
                  {clear.label}
                </Button>
              </View>
            )}
            <Button variant="ghost" size="sm" onPress={onCancel}>
              Annuler
            </Button>
            <Button size="sm" onPress={() => onConfirm(visitDateOf(picked.year, picked.month))}>
              Enregistrer
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.surfaceScrim,
  },
  // As NameDialog: 320 pt wide at most, 22/20/16 pt padding, 10 pt between its parts.
  dialog: {
    width: '100%',
    maxWidth: 320,
    gap: 10,
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
    boxShadow: shadow[2],
  },
  title: {
    ...text.displayS,
    color: colors.textPrimary,
  },
  year: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  step: {
    width: layout.hitMin,
    height: layout.hitMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  yearText: {
    ...text.title,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  // Three months a row, four rows.
  months: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 6,
  },
  month: {
    width: '33.333%',
    minHeight: layout.hitMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  selected: {
    backgroundColor: colors.ink1,
  },
  monthText: {
    ...text.label,
    color: colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  // Apart from the others, at the start of the line.
  clear: {
    marginRight: 'auto',
  },
});
