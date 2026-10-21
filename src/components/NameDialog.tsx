// The design system's Dialog holding one Input: asks for a name, of a Custom City say.
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, layout, radius, shadow, text } from '@/theme/tokens';

import { Button } from './Button';

type Props = {
  /** Shown while true; the name typed starts over at `initial` each time it opens. */
  open: boolean;
  title: string;
  /** The name it opens with: empty for a new Place. */
  initial?: string;
  /** Label of the button that gives the name, e.g. « Créer ». */
  confirm: string;
  /** Called with the name typed, trimmed and never empty. */
  onConfirm: (name: string) => void;
  onCancel: () => void;
};

export function NameDialog({ open, title, initial = '', confirm, onConfirm, onCancel }: Props) {
  const [name, setName] = useState(initial);
  // Each opening starts from `initial`, not from what was typed last time.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setName(initial);
  }
  const trimmed = name.trim();
  const submit = () => {
    if (trimmed !== '') onConfirm(trimmed);
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView style={styles.scrim} behavior="padding">
        {/* A tap beside the dialog cancels it. */}
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Annuler" onPress={onCancel} />
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            onSubmitEditing={submit}
            placeholder="Nom du lieu"
            placeholderTextColor={colors.textMuted}
            autoFocus
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            style={styles.input}
          />
          <View style={styles.actions}>
            <Button variant="ghost" size="sm" onPress={onCancel}>
              Annuler
            </Button>
            <Button size="sm" disabled={trimmed === ''} onPress={submit}>
              {confirm}
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  // 320 pt wide at most, 22/20/16 pt padding, 10 pt between its parts.
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
  // The design system's Input: 44 pt, ink border, never a glow.
  input: {
    ...text.body,
    minHeight: layout.hitMin,
    paddingHorizontal: 14,
    borderWidth: layout.borderWidth,
    borderColor: colors.borderFocus,
    borderRadius: radius.md,
    color: colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
});
