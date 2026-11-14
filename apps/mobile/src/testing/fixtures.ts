import type { ConversationDetail, ConversationSummary, Message, UserChip } from '@campus/shared';

export const asha: UserChip = { id: 'u-asha', name: 'Asha Rao', username: 'asha', avatarUrl: null, color: '#3D5AFE' };
export const dev: UserChip = { id: 'u-dev', name: 'Dev Shah', username: 'dev', avatarUrl: null, color: '#FF3D8B' };

let counter = 0;
export function makeMessage(overrides: Partial<Message> = {}): Message {
  counter += 1;
  return {
    id: `6000000000000000000000${String(counter).padStart(2, '0')}`,
    conversationId: 'c1',
    clientMessageId: `client-${counter}`,
    sender: asha,
    type: 'text',
    body: `message ${counter}`,
    attachments: [],
    replyTo: null,
    threadRootId: null,
    threadReplyCount: 0,
    reactions: [],
    edited: false,
    deleted: false,
    createdAt: '2026-11-15T09:05:00.000Z',
    ...overrides,
  };
}

export function makeConversation(overrides: Partial<ConversationSummary> = {}): ConversationSummary {
  return {
    id: 'c1',
    type: 'dm',
    title: 'Dev Shah',
    imageUrl: null,
    color: dev.color,
    peer: { ...dev, online: false },
    clubId: null,
    lastMessage: { body: 'see you there', senderName: 'Dev Shah', createdAt: '2026-11-15T09:05:00.000Z' },
    unreadCount: 0,
    memberCount: 2,
    myRole: 'member',
    ...overrides,
  };
}

export const makeDetail = (overrides: Partial<ConversationDetail> = {}): ConversationDetail => ({
  ...makeConversation(),
  description: '',
  readBy: [{ userId: dev.id, messageId: null }],
  ...overrides,
});

export const pages = (...groups: Message[][]) => ({
  pages: groups.map((data, index) => ({ data, nextCursor: index === groups.length - 1 ? null : 'more' })),
  pageParams: groups.map(() => undefined),
});
