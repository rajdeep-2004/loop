import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import type { ConversationDetail, ConversationSummary, Message, Page } from '@campus/shared';
import { useMe } from '@/features/auth/AuthContext';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { addMessage, chatKeys, type MessagePages } from './cache';
import { enqueue, retry, type Draft } from './outbox';
import type { ChatMessage } from './types';

const PAGE_SIZE = 30;
const TYPING_REPEAT_MS = 3000;

const withCursor = (path: string, cursor: string | undefined) =>
  cursor ? `${path}${path.includes('?') ? '&' : '?'}cursor=${encodeURIComponent(cursor)}` : path;

export function useConversations() {
  return useInfiniteQuery({
    queryKey: chatKeys.conversations,
    queryFn: ({ pageParam }) => api.page<ConversationSummary>(withCursor(`/conversations?limit=${PAGE_SIZE}`, pageParam)),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useUnreadTotal() {
  return useQuery({
    queryKey: chatKeys.unreadTotal,
    queryFn: () => api.get<{ total: number }>('/conversations/unread-total'),
    select: (data) => data.total,
  });
}

export function useConversation(id: string) {
  return useQuery({ queryKey: chatKeys.conversation(id), queryFn: () => api.get<ConversationDetail>(`/conversations/${id}`) });
}

/** Messages of a conversation, or of one thread inside it, newest first. */
export function useMessages(conversationId: string, threadRootId?: string) {
  return useInfiniteQuery({
    queryKey: threadRootId ? chatKeys.thread(conversationId, threadRootId) : chatKeys.messages(conversationId),
    queryFn: ({ pageParam }): Promise<Page<Message>> =>
      api.page<Message>(
        withCursor(
          `/conversations/${conversationId}/messages?limit=${PAGE_SIZE}${threadRootId ? `&threadRootId=${threadRootId}` : ''}`,
          pageParam,
        ),
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    // New messages arrive over the socket; refetching on every focus would only cost data.
    staleTime: Infinity,
  });
}

/** Returns `send` and `resend`. Both put the confirmed message into the cache when the server answers. */
export function useSendMessage(conversationId: string, threadRootId?: string) {
  const me = useMe();
  const queryClient = useQueryClient();
  const key = threadRootId ? chatKeys.thread(conversationId, threadRootId) : chatKeys.messages(conversationId);

  const onSaved = useCallback(
    (saved: Message) => {
      queryClient.setQueryData<MessagePages>(key, (data) => addMessage(data, saved));
      if (!threadRootId) void queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
    },
    [queryClient, key, threadRootId],
  );

  const send = useCallback(
    (draft: Omit<Draft, 'conversationId' | 'threadRootId'>) =>
      enqueue(
        { ...draft, conversationId, threadRootId },
        { id: me.id, name: me.name, username: me.username, avatarUrl: me.avatarUrl, color: me.school?.color ?? null },
        onSaved,
      ),
    [conversationId, threadRootId, me, onSaved],
  );
  const resend = useCallback((message: ChatMessage) => retry(message, onSaved), [onSaved]);
  return { send, resend };
}

/** Marks the newest message from someone else as read, once per message. */
export function useMarkRead(conversationId: string, messages: ChatMessage[]) {
  const me = useMe();
  const queryClient = useQueryClient();
  const lastMarked = useRef<string | null>(null);
  const newest = messages.find((message) => !message.status && message.sender.id !== me.id);
  const newestId = newest?.id ?? null;

  useEffect(() => {
    if (!newestId || lastMarked.current === newestId) return;
    lastMarked.current = newestId;
    api
      .postVoid(`/conversations/${conversationId}/read`, { messageId: newestId })
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
        void queryClient.invalidateQueries({ queryKey: chatKeys.unreadTotal });
      })
      .catch(() => {
        // Not marked: allow another attempt when the next message arrives.
        lastMarked.current = null;
      });
  }, [conversationId, newestId, queryClient]);
}

/** Call `typing()` on every keystroke and `stopped()` on send or blur. Sends at most one "typing" every few seconds. */
export function useTypingSignal(conversationId: string) {
  const lastSent = useRef(0);
  const typing = useCallback(() => {
    const now = Date.now();
    if (now - lastSent.current < TYPING_REPEAT_MS) return;
    lastSent.current = now;
    getSocket()?.emit('typing', { conversationId, typing: true });
  }, [conversationId]);
  const stopped = useCallback(() => {
    if (lastSent.current === 0) return;
    lastSent.current = 0;
    getSocket()?.emit('typing', { conversationId, typing: false });
  }, [conversationId]);
  useEffect(() => stopped, [stopped]);
  return { typing, stopped };
}
