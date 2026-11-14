import { Pressable, StyleSheet, View } from 'react-native';
import { formatTime } from '@/lib/time';
import { BORDER, Txt, colors, space } from '@/ui';
import type { ChatMessage } from './types';

type Props = {
  message: ChatMessage;
  mine: boolean;
  /** Show the sender's name above the bubble (group and club chats). */
  showSender?: boolean;
  /** "Sent" or "Read", shown under the newest message I sent. */
  receipt?: string | null;
  onLongPress?: (message: ChatMessage) => void;
  onRetry?: (message: ChatMessage) => void;
  onOpenThread?: (message: ChatMessage) => void;
  children?: React.ReactNode;
};

export function footerText(message: ChatMessage, receipt?: string | null): string {
  if (message.status === 'sending') return 'Sending';
  if (message.status === 'failed') return 'Not sent. Tap to retry';
  return [formatTime(message.createdAt), message.edited ? 'Edited' : null, receipt].filter(Boolean).join(' · ');
}

export function MessageBubble({ message, mine, showSender = false, receipt, onLongPress, onRetry, onOpenThread, children }: Props) {
  const failed = message.status === 'failed';
  const background = message.deleted ? colors.paper : failed ? colors.red : mine ? colors.mint : colors.white;

  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
      <Pressable
        onLongPress={onLongPress && !message.status && !message.deleted ? () => onLongPress(message) : undefined}
        onPress={failed && onRetry ? () => onRetry(message) : undefined}
        accessibilityRole={failed ? 'button' : undefined}
        accessibilityLabel={failed ? 'Message not sent. Tap to retry' : undefined}
        style={[styles.bubble, { backgroundColor: background }, message.sender.color && !mine ? { borderLeftColor: message.sender.color, borderLeftWidth: 8 } : null]}>
        {showSender && !mine ? <Txt variant="label">{message.sender.name}</Txt> : null}
        {message.replyTo ? (
          <View style={styles.quote}>
            <Txt variant="label">{message.replyTo.senderName}</Txt>
            <Txt variant="small" numberOfLines={2}>
              {message.replyTo.deleted ? 'Message deleted' : message.replyTo.body}
            </Txt>
          </View>
        ) : null}
        {message.deleted ? (
          <Txt color={colors.gray} style={styles.deleted}>
            Message deleted
          </Txt>
        ) : (
          <>
            {children}
            {message.body ? <Txt>{message.body}</Txt> : null}
          </>
        )}
        <Txt variant="small" color={failed ? colors.ink : colors.gray}>
          {footerText(message, receipt)}
        </Txt>
      </Pressable>

      {message.reactions.length > 0 ? (
        <View style={styles.reactions}>
          {message.reactions.map((reaction) => (
            <View key={reaction.emoji} style={styles.reaction}>
              <Txt variant="small">
                {reaction.emoji} {reaction.userIds.length}
              </Txt>
            </View>
          ))}
        </View>
      ) : null}

      {message.threadReplyCount > 0 && onOpenThread ? (
        <Pressable onPress={() => onOpenThread(message)} accessibilityRole="button" style={styles.thread}>
          <Txt variant="label">
            {message.threadReplyCount} {message.threadReplyCount === 1 ? 'reply' : 'replies'} →
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginVertical: space.xs, maxWidth: '84%', gap: space.xs },
  rowMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  rowTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { borderWidth: BORDER, borderColor: colors.ink, padding: space.sm, gap: space.xs },
  quote: { borderLeftWidth: 4, borderLeftColor: colors.ink, paddingLeft: space.sm, backgroundColor: colors.paper, padding: space.xs },
  deleted: { fontStyle: 'italic' },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  reaction: { borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.yellow, paddingHorizontal: space.sm, paddingVertical: 2 },
  thread: { borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.white, paddingHorizontal: space.sm, paddingVertical: space.xs },
});
