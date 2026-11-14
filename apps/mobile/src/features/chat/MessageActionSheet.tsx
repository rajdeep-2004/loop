import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { REACTION_EMOJIS, type Message, type ReactionEmoji } from '@campus/shared';
import { BORDER, Button, TOUCH, Txt, colors, space } from '@/ui';
import { myReaction } from './cache';

type Props = {
  message: Message;
  myId: string;
  onClose: () => void;
  onReply: (message: Message) => void;
  onReact: (message: Message, emoji: ReactionEmoji) => void;
  onEdit: (message: Message) => void;
  /** Resolves to true when the message was deleted; the sheet then closes. */
  onDelete: (message: Message) => Promise<boolean>;
};

/** Bottom sheet opened by a long press on a message: react, reply, and for my own messages edit and delete. */
export function MessageActionSheet({ message, myId, onClose, onReply, onReact, onEdit, onDelete }: Props) {
  const insets = useSafeAreaInsets();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const mine = message.sender.id === myId;
  const current = myReaction(message, myId);

  const choose = (action: () => void) => {
    action();
    onClose();
  };

  const confirmDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    const deleted = await onDelete(message);
    setDeleting(false);
    if (deleted) onClose();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={deleting ? undefined : onClose} accessibilityRole="button" accessibilityLabel="Close message actions" />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        <View style={styles.quote}>
          <Txt variant="label">{mine ? 'You' : message.sender.name}</Txt>
          <Txt variant="small" numberOfLines={2}>
            {message.body || message.attachments[0]?.name || 'Attachment'}
          </Txt>
        </View>

        {confirming ? (
          <>
            <Txt variant="heading">Delete this message for everyone?</Txt>
            <Txt variant="small" color={colors.gray}>
              It will show as “Message deleted”. This cannot be undone.
            </Txt>
            <Button label="Delete message" color={colors.red} onPress={confirmDelete} loading={deleting} />
            <Button label="Keep message" color={colors.white} onPress={() => setConfirming(false)} disabled={deleting} />
          </>
        ) : (
          <>
            <View style={styles.emojis}>
              {REACTION_EMOJIS.map((emoji) => {
                const selected = current === emoji;
                return (
                  <Pressable
                    key={emoji}
                    onPress={() => choose(() => onReact(message, emoji))}
                    accessibilityRole="button"
                    accessibilityLabel={selected ? `Remove ${emoji} reaction` : `React with ${emoji}`}
                    accessibilityState={{ selected }}
                    style={[styles.emoji, selected && styles.emojiSelected]}>
                    <Txt variant="heading">{emoji}</Txt>
                  </Pressable>
                );
              })}
            </View>
            <Button label="Reply" onPress={() => choose(() => onReply(message))} />
            {mine ? <Button label="Edit" color={colors.white} onPress={() => choose(() => onEdit(message))} /> : null}
            {mine ? <Button label="Delete" color={colors.red} onPress={() => setConfirming(true)} /> : null}
            <Button label="Cancel" color={colors.white} onPress={onClose} />
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: { borderTopWidth: BORDER, borderTopColor: colors.ink, backgroundColor: colors.paper, padding: space.lg, gap: space.md },
  quote: { borderLeftWidth: 4, borderLeftColor: colors.ink, backgroundColor: colors.white, padding: space.sm },
  emojis: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  emoji: {
    flex: 1,
    minHeight: TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER,
    borderColor: colors.ink,
    backgroundColor: colors.white,
  },
  emojiSelected: { backgroundColor: colors.yellow },
});
