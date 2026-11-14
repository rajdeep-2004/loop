import { FlatList, StyleSheet, View } from 'react-native';
import { useMe } from '@/features/auth/AuthContext';
import { typingLabel, useTypingNames } from '@/features/realtime/liveState';
import { errorMessage } from '@/lib/api';
import { EmptyState, ErrorState, Loading, Txt, colors, space } from '@/ui';
import { isReadByAll, mergeOutbox } from './cache';
import { useConversation, useMarkRead, useMessages } from './hooks';
import { MessageBubble } from './MessageBubble';
import { useOutbox } from './outbox';
import type { ReactionEmoji } from '@campus/shared';
import type { ChatMessage } from './types';

type Props = {
  conversationId: string;
  onRetry: (message: ChatMessage) => void;
  onLongPress?: (message: ChatMessage) => void;
  onOpenThread?: (message: ChatMessage) => void;
  onReact?: (message: ChatMessage, emoji: ReactionEmoji) => void;
  renderAttachment?: (message: ChatMessage) => React.ReactNode;
};

/** The scrolling message list of one conversation, newest at the bottom. */
export function MessageList({ conversationId, onRetry, onLongPress, onOpenThread, onReact, renderAttachment }: Props) {
  const me = useMe();
  const detail = useConversation(conversationId);
  const messages = useMessages(conversationId);
  const outbox = useOutbox(conversationId);
  const typing = typingLabel(useTypingNames(conversationId));
  const rows = mergeOutbox(messages.data, outbox);
  useMarkRead(conversationId, rows);

  if (messages.isPending) return <Loading label="Loading messages" />;
  if (messages.isError) return <ErrorState message={errorMessage(messages.error)} onRetry={() => messages.refetch()} />;

  const isDm = detail.data?.type === 'dm';
  const newestMine = rows.find((message) => message.sender.id === me.id && !message.status);

  return (
    <View style={styles.fill}>
      {rows.length === 0 ? (
        <EmptyState title="Say hello" hint="This is the start of the conversation." />
      ) : (
        <FlatList
          inverted
          data={rows}
          keyExtractor={(message) => message.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              mine={item.sender.id === me.id}
              showSender={!isDm}
              receipt={isDm && item.id === newestMine?.id ? (isReadByAll(detail.data, item.id) ? 'Read' : 'Sent') : null}
              onRetry={onRetry}
              onLongPress={onLongPress}
              onReact={item.status ? undefined : onReact}
              myId={me.id}
              onOpenThread={onOpenThread}>
              {renderAttachment?.(item)}
            </MessageBubble>
          )}
          onEndReached={() => messages.hasNextPage && !messages.isFetchingNextPage && messages.fetchNextPage()}
          onEndReachedThreshold={0.3}
          keyboardShouldPersistTaps="handled"
        />
      )}
      {typing ? (
        <Txt variant="label" color={colors.gray} style={styles.typing} accessibilityLiveRegion="polite">
          {typing}…
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: { padding: space.md },
  typing: { paddingHorizontal: space.lg, paddingVertical: space.xs },
});
