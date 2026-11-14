import { Pressable, StyleSheet, View } from 'react-native';
import type { ConversationSummary } from '@campus/shared';
import { useOnline } from '@/features/realtime/liveState';
import { formatListTime } from '@/lib/time';
import { Avatar, BORDER, Txt, colors, space } from '@/ui';

const KIND_LABEL: Record<ConversationSummary['type'], string | null> = { dm: null, group: 'Group', club: 'Club' };
const KIND_COLOR: Record<ConversationSummary['type'], string> = { dm: colors.yellow, group: colors.mint, club: colors.pink };

export function ConversationRow({ conversation, onPress }: { conversation: ConversationSummary; onPress: () => void }) {
  const online = useOnline(conversation.peer?.id, conversation.peer?.online);
  const unread = conversation.unreadCount > 0;
  const last = conversation.lastMessage;
  const preview = last ? (conversation.type === 'dm' ? last.body : `${last.senderName.split(' ')[0]}: ${last.body}`) : 'No messages yet';
  const kind = KIND_LABEL[conversation.type];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${conversation.title}${unread ? `, ${conversation.unreadCount} unread` : ''}`}
      style={({ pressed }) => [styles.row, unread && styles.unread, pressed && styles.pressed]}>
      <Avatar name={conversation.title} avatarUrl={conversation.imageUrl} color={conversation.color ?? KIND_COLOR[conversation.type]} online={online} />
      <View style={styles.middle}>
        <View style={styles.titleLine}>
          <Txt variant="heading" numberOfLines={1} style={styles.title}>
            {conversation.title}
          </Txt>
          {kind ? <Txt variant="label">{kind}</Txt> : null}
        </View>
        <Txt variant="small" color={unread ? colors.ink : colors.gray} numberOfLines={1}>
          {preview}
        </Txt>
      </View>
      <View style={styles.right}>
        {last ? <Txt variant="small" color={colors.gray}>{formatListTime(last.createdAt)}</Txt> : null}
        {unread ? (
          <View style={styles.count}>
            <Txt variant="label">{conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}</Txt>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderBottomWidth: BORDER,
    borderBottomColor: colors.ink,
    backgroundColor: colors.white,
  },
  unread: { backgroundColor: colors.yellow },
  pressed: { backgroundColor: colors.mint },
  middle: { flex: 1, gap: 2 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { flexShrink: 1 },
  right: { alignItems: 'flex-end', gap: space.xs },
  count: { minWidth: 24, paddingHorizontal: 6, height: 24, borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.pink, alignItems: 'center', justifyContent: 'center' },
});
