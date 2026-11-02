// The design system's Dialog, asking to confirm an action: a serif title, a short body, and
// « Annuler » (ghost) beside the action (primary).
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadow, text } from '@/theme/tokens';

import { Button } from './Button';

type Props = {
  open: boolean;
  /** « Supprimer la photo ? », say. */
  title: string;
  /** What the action does, in a sentence. */
  body: string;
  /** Label of the button that confirms, e.g. « Supprimer ». */
  confirm: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({ open, title, body, confirm, onConfirm, onCancel }: Props) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.scrim}>
        {/* A tap beside the dialog cancels it. */}
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Annuler" onPress={onCancel} />
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <View style={styles.actions}>
            <Button variant="ghost" size="sm" onPress={onCancel}>
              Annuler
            </Button>
            <Button size="sm" onPress={onConfirm}>
              {confirm}
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
  body: {
    ...text.bodyS,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
});
