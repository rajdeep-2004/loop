import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { ConversationDetail, Message, Page, ReactionEmoji } from '@campus/shared';
import type { ChatMessage } from './types';

export type MessagePages = InfiniteData<Page<Message>, unknown>;

export const chatKeys = {
  conversations: ['conversations'] as const,
  unreadTotal: ['unread-total'] as const,
  conversation: (id: string) => ['conversation', id] as const,
  messages: (id: string) => ['messages', id] as const,
  thread: (id: string, rootId: string) => ['messages', id, 'thread', rootId] as const,
};

/** Adds a new message to the newest page unless it is already there. Pure: returns a new object. */
export function addMessage(data: MessagePages | undefined, message: Message): MessagePages | undefined {
  if (!data) return data;
  if (data.pages.some((page) => page.data.some((item) => item.id === message.id))) return replaceMessage(data, message);
  const [first, ...rest] = data.pages;
  if (!first) return data;
  return { ...data, pages: [{ ...first, data: [message, ...first.data] }, ...rest] };
}

/** Swaps in a newer copy of a message (edited, deleted, reacted to). */
export function replaceMessage(data: MessagePages | undefined, message: Message): MessagePages | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      data: page.data.map((item) => (item.id === message.id ? message : item)),
    })),
  };
}

/** Writes a newer copy of a message into every cached list that can hold it (the chat and its thread). */
export function storeMessageUpdate(queryClient: QueryClient, message: Message): void {
  queryClient.setQueryData<MessagePages>(chatKeys.messages(message.conversationId), (data) => replaceMessage(data, message));
  if (message.threadRootId) {
    queryClient.setQueryData<MessagePages>(chatKeys.thread(message.conversationId, message.threadRootId), (data) =>
      replaceMessage(data, message),
    );
  }
}

/** The emoji this user has put on the message, or null. */
export function myReaction(message: Message, userId: string): string | null {
  return message.reactions.find((reaction) => reaction.userIds.includes(userId))?.emoji ?? null;
}

/** What a tap on an emoji means: tapping my current reaction removes it, anything else selects it. */
export function nextReaction(message: Message, userId: string, emoji: ReactionEmoji): ReactionEmoji | null {
  return myReaction(message, userId) === emoji ? null : emoji;
}

/**
 * The message as it will look once the server applies the change: the user is taken out of
 * every reaction, empty groups go, and the user joins `emoji` (null = no reaction). Pure.
 */
export function applyReaction(message: Message, userId: string, emoji: ReactionEmoji | null): Message {
  const others = message.reactions
    .map((reaction) => ({ ...reaction, userIds: reaction.userIds.filter((id) => id !== userId) }))
    .filter((reaction) => reaction.userIds.length > 0);
  if (emoji === null) return { ...message, reactions: others };
  const reactions = others.some((reaction) => reaction.emoji === emoji)
    ? others.map((reaction) => (reaction.emoji === emoji ? { ...reaction, userIds: [...reaction.userIds, userId] } : reaction))
    : [...others, { emoji, userIds: [userId] }];
  return { ...message, reactions };
}

/** Newest first: messages still being sent, then everything the server has confirmed. */
export function mergeOutbox(data: MessagePages | undefined, outbox: ChatMessage[]): ChatMessage[] {
  const confirmed = data?.pages.flatMap((page) => page.data) ?? [];
  const confirmedClientIds = new Set(confirmed.map((message) => message.clientMessageId));
  const waiting = outbox.filter((message) => !confirmedClientIds.has(message.clientMessageId));
  return [...waiting, ...confirmed];
}

/** Records how far another member has read. */
export function applyRead(
  detail: ConversationDetail | undefined,
  event: { userId: string; messageId: string },
): ConversationDetail | undefined {
  if (!detail) return detail;
  const known = detail.readBy.some((entry) => entry.userId === event.userId);
  const readBy = known
    ? detail.readBy.map((entry) => (entry.userId === event.userId ? { ...entry, messageId: event.messageId } : entry))
    : [...detail.readBy, { userId: event.userId, messageId: event.messageId }];
  return { ...detail, readBy };
}

/**
 * Whether every other member has read this message. ObjectIds are fixed-length hex
 * strings that begin with a timestamp, so comparing them as text compares their age.
 */
export function isReadByAll(detail: ConversationDetail | undefined, messageId: string): boolean {
  if (!detail || detail.readBy.length === 0) return false;
  return detail.readBy.every((entry) => entry.messageId !== null && entry.messageId >= messageId);
}
