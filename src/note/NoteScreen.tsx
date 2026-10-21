// The Note of a Place: its free text and its Todos, opened from « Ouvrir le carnet ».
// Writing it never marks the Place.
import { router } from 'expo-router';
import { ChevronLeft, MapPin, Plus } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { AppState, KeyboardAvoidingView, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/IconButton';
import { useShowOnGlobe } from '@/globe/ShowOnGlobeProvider';
import type { City, PlaceRef } from '@/journal/journal';
import { useJournal } from '@/journal/JournalProvider';
import { formatCoordinates } from '@/sheet/coordinates';
import { colors, layout, radius, space, text } from '@/theme/tokens';

import { TodoList } from './TodoList';

type Props = {
  /** A City not yet in the Journal is given whole: writing its Note or a Todo puts it there. */
  place: PlaceRef | City;
  name: string;
  /** The Country an Island, a Region or a City belongs to, shown above its name. */
  country?: string;
  lon: number;
  lat: number;
};

/** The Note is written to the Journal once the typing pauses this long, in milliseconds. */
const SAVE_AFTER = 400;

const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

/** "octobre 2026", from a Visit date in YYYY-MM. */
const formatVisitDate = (visitDate: string) => {
  const [year, month] = visitDate.split('-');
  return `${MONTHS[Number(month) - 1]} ${year}`;
};

export function NoteScreen({ place, name, country, lon, lat }: Props) {
  const insets = useSafeAreaInsets();
  const { journal, writeNote, addTodo, checkTodo, moveTodo, deleteTodo } = useJournal();
  const { show } = useShowOnGlobe();
  const scroll = useRef<ScrollView>(null);
  const record = journal.place(place);
  const todos = journal.todos(place);

  // Typed into here, and written to the Journal when the typing pauses or the screen closes.
  const [note, setNote] = useState(record?.note ?? '');
  const [editing, setEditing] = useState(false);
  const saved = useRef(note);
  const save = useRef(() => {});
  // Before the timer below, so it always saves the text typed last.
  useEffect(() => {
    save.current = () => {
      // Blank space alone is no Note.
      const next = note.trim() === '' ? '' : note;
      if (next !== saved.current) writeNote(place, next);
      saved.current = next;
    };
  });
  useEffect(() => {
    const timer = setTimeout(() => save.current(), SAVE_AFTER);
    return () => clearTimeout(timer);
  }, [note]);
  useEffect(() => {
    // Leaving the app may be the last chance: it can be killed in the background.
    const leaving = AppState.addEventListener('change', (state) => state !== 'active' && save.current());
    return () => {
      leaving.remove();
      save.current();
    };
  }, []);

  const [draft, setDraft] = useState('');
  const submitTodo = () => {
    const todo = draft.trim();
    if (todo !== '') addTodo(place, todo);
    setDraft('');
  };

  const showOnGlobe = () => {
    show(place);
    router.dismissTo('/');
  };

  const visitDate = record?.visitDate;
  const where = formatCoordinates(lon, lat);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <IconButton variant="ghost" icon={ChevronLeft} label="Retour" onPress={() => router.back()} />
      </View>
      <ScrollView
        ref={scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space[9] }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive">
        <View style={styles.heading}>
          {country && <Text style={styles.overline}>{country}</Text>}
          <Text style={styles.title}>{name}</Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Voir ${name} sur le globe`}
            onPress={showOnGlobe}
            style={({ pressed }) => [styles.location, pressed && { backgroundColor: colors.paper2 }]}>
            <MapPin color={colors.accent} size={14} strokeWidth={2} />
            <Text style={styles.locationText}>{visitDate ? `${formatVisitDate(visitDate)} · ${where}` : where}</Text>
          </Pressable>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Note</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            onFocus={() => setEditing(true)}
            onBlur={() => {
              setEditing(false);
              save.current();
            }}
            multiline
            placeholder="Ce que vous voulez retenir…"
            placeholderTextColor={colors.textDisabled}
            // An ink border on focus, never a glow.
            style={[styles.note, editing && { borderColor: colors.borderFocus }]}
          />
        </View>

        <View>
          <Text style={styles.label}>À faire</Text>
          <TodoList
            todos={todos}
            scroll={scroll}
            onCheck={checkTodo}
            onMove={moveTodo}
            onDelete={deleteTodo}
          />
          <View style={styles.addRow}>
            <Plus color={colors.textMuted} size={20} strokeWidth={2} />
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={submitTodo}
              submitBehavior="submit"
              returnKeyType="done"
              placeholder="Ajouter à faire"
              placeholderTextColor={colors.textDisabled}
              accessibilityLabel="Ajouter à faire"
              style={styles.addInput}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  content: {
    paddingHorizontal: layout.screenGutter,
    gap: 18,
  },
  heading: {
    gap: space[2],
  },
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
  // A 32 pt pill, its background showing while pressed.
  location: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    paddingLeft: space[3],
    paddingRight: 10,
    marginLeft: -space[3],
    borderRadius: radius.pill,
  },
  locationText: {
    ...text.caption,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  field: {
    gap: 6,
  },
  label: {
    ...text.label,
    color: colors.textSecondary,
    marginBottom: space[1],
  },
  // Multiline, four rows tall before it grows.
  note: {
    ...text.body,
    color: colors.textPrimary,
    minHeight: text.body.lineHeight * 4 + space[4] * 2,
    paddingHorizontal: 14,
    paddingTop: space[4],
    paddingBottom: space[4],
    textAlignVertical: 'top',
    backgroundColor: colors.surfaceRaised,
    borderWidth: layout.borderWidth,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
    minHeight: layout.hitMin,
  },
  addInput: {
    ...text.body,
    flex: 1,
    color: colors.textPrimary,
    paddingVertical: space[3],
  },
});
