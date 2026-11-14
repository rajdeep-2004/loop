import type { Message, SendMessageInput, UserChip } from '@campus/shared';
import { ApiError, api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { createStore, useStore } from '@/lib/store';
import type { ChatMessage } from './types';

const ACK_TIMEOUT_MS = 8000;
const EMPTY: ChatMessage[] = [];

type Outbox = Record<string, ChatMessage[]>;
export const outboxStore = createStore<Outbox>({});

/** Messages of one conversation (or one thread) that the server has not confirmed yet. */
export const outboxKey = (conversationId: string, threadRootId?: string | null) =>
  threadRootId ? `${conversationId}:${threadRootId}` : conversationId;

export const useOutbox = (key: string) => useStore(outboxStore, (state) => state[key] ?? EMPTY);

let counter = 0;
/** Unique per send. The server uses it to recognise a retry of the same message. */
export const newClientMessageId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${(counter += 1)}`;

const update = (key: string, change: (messages: ChatMessage[]) => ChatMessage[]) =>
  outboxStore.set((state) => ({ ...state, [key]: change(state[key] ?? []) }));

export type Draft = Pick<SendMessageInput, 'body' | 'replyToId' | 'threadRootId' | 'attachments'> & {
  conversationId: string;
  replyTo?: Message['replyTo'];
};

/** Sends over the socket when it is connected, over HTTP otherwise. Both are safe to repeat. */
async function deliver(message: ChatMessage): Promise<Message> {
  const payload = {
    clientMessageId: message.clientMessageId,
    body: message.body,
    replyToId: message.replyTo?.id,
    threadRootId: message.threadRootId ?? undefined,
    attachments: message.attachments,
  };
  const socket = getSocket();
  if (socket?.connected) {
    try {
      const ack = await socket.timeout(ACK_TIMEOUT_MS).emitWithAck('message:send', { ...payload, conversationId: message.conversationId });
      if (ack.ok) return ack.data;
      throw new ApiError(ack.error.code, 400, ack.error.message);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      // No acknowledgement in time: fall through to HTTP. The clientMessageId makes the repeat harmless.
    }
  }
  return api.post<Message>(`/conversations/${message.conversationId}/messages`, payload);
}

async function attempt(key: string, message: ChatMessage, onSaved: (saved: Message) => void): Promise<void> {
  try {
    const saved = await deliver(message);
    onSaved(saved);
    update(key, (messages) => messages.filter((item) => item.clientMessageId !== message.clientMessageId));
  } catch {
    update(key, (messages) =>
      messages.map((item) => (item.clientMessageId === message.clientMessageId ? { ...item, status: 'failed' } : item)),
    );
  }
}

/** Shows the message immediately as "sending", then delivers it. */
export function enqueue(draft: Draft, sender: UserChip, onSaved: (saved: Message) => void): void {
  const clientMessageId = newClientMessageId();
  const attachment = draft.attachments?.[0];
  const message: ChatMessage = {
    id: `pending:${clientMessageId}`,
    conversationId: draft.conversationId,
    clientMessageId,
    sender,
    type: attachment ? (attachment.mimeType.startsWith('image/') ? 'image' : 'file') : 'text',
    body: draft.body ?? '',
    attachments: draft.attachments ?? [],
    replyTo: draft.replyTo ?? null,
    threadRootId: draft.threadRootId ?? null,
    threadReplyCount: 0,
    reactions: [],
    edited: false,
    deleted: false,
    createdAt: new Date().toISOString(),
    status: 'sending',
  };
  const key = outboxKey(draft.conversationId, draft.threadRootId);
  update(key, (messages) => [message, ...messages]);
  void attempt(key, message, onSaved);
}

/** Tries a failed message again with the same clientMessageId. */
export function retry(message: ChatMessage, onSaved: (saved: Message) => void): void {
  const key = outboxKey(message.conversationId, message.threadRootId);
  update(key, (messages) =>
    messages.map((item) => (item.clientMessageId === message.clientMessageId ? { ...item, status: 'sending' } : item)),
  );
  void attempt(key, { ...message, status: 'sending' }, onSaved);
}

export function discard(message: ChatMessage): void {
  update(outboxKey(message.conversationId, message.threadRootId), (messages) =>
    messages.filter((item) => item.clientMessageId !== message.clientMessageId),
  );
}
