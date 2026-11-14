import { DELETED_MESSAGE_TEXT, type Attachment, type Message, type Page } from '@campus/shared';
import { AppError, badRequest, isDuplicateKeyError, notFound } from '../../lib/errors';
import { isId, toId } from '../../lib/db';
import { toPage } from '../../lib/paging';
import { emitToUsers } from '../../realtime/gateway';
import { ConversationMemberModel, ConversationModel } from '../conversations/conversation.models';
import { memberIds, requireMember } from '../conversations/conversations.service';
import { MessageModel, type MessageDoc } from './message.model';
import { presentMessage, presentMessages } from './messages.presenter';

const PREVIEW_LENGTH = 80;

export type NewMessage = {
  clientMessageId: string;
  body: string;
  replyToId?: string;
  threadRootId?: string;
  attachments: Attachment[];
};

/** The line the chat list shows for a message. */
export function previewOf(message: MessageDoc): string {
  if (message.deletedAt) return DELETED_MESSAGE_TEXT;
  if (message.body) return message.body.slice(0, PREVIEW_LENGTH);
  return message.type === 'image' ? 'Photo' : `File: ${message.attachments[0]?.name ?? 'attachment'}`;
}

async function assertInConversation(messageId: string, conversationId: string, what: string): Promise<MessageDoc> {
  const message = await MessageModel.findOne({ _id: messageId, conversationId }).lean();
  if (!message) throw badRequest('invalid_reference', `${what} is not in this conversation`);
  return message;
}

/**
 * Saves a message and delivers it. Idempotent on (sender, clientMessageId): a
 * retry after a dropped connection returns the message that was already saved.
 */
export async function sendMessage(userId: string, conversationId: string, input: NewMessage): Promise<Message> {
  await requireMember(conversationId, userId);
  if (input.replyToId) await assertInConversation(input.replyToId, conversationId, 'The replied-to message');

  let threadRoot: MessageDoc | null = null;
  if (input.threadRootId) {
    threadRoot = await assertInConversation(input.threadRootId, conversationId, 'The thread');
    if (threadRoot.threadRootId) throw badRequest('nested_thread', 'A thread reply cannot start its own thread');
    const conversation = await ConversationModel.findById(conversationId).select('type').lean();
    if (conversation?.type === 'dm') throw badRequest('threads_not_in_dm', 'Threads exist only in group and club chats');
  }

  const attachment = input.attachments[0];
  let created: MessageDoc;
  try {
    created = (
      await MessageModel.create({
        conversationId,
        senderId: userId,
        clientMessageId: input.clientMessageId,
        type: attachment ? (attachment.mimeType.startsWith('image/') ? 'image' : 'file') : 'text',
        body: input.body,
        attachments: input.attachments,
        replyToId: input.replyToId ?? null,
        threadRootId: input.threadRootId ?? null,
      })
    ).toObject();
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const existing = await MessageModel.findOne({ senderId: userId, clientMessageId: input.clientMessageId }).lean();
    if (!existing) throw error;
    return presentMessage(existing);
  }

  const message = await presentMessage(created);
  const recipients = await memberIds(conversationId);

  if (threadRoot) {
    // Thread replies stay out of the main chat: no preview, no unread count.
    const root = await MessageModel.findByIdAndUpdate(
      threadRoot._id,
      { $inc: { threadReplyCount: 1 } },
      { returnDocument: 'after' },
    ).lean();
    if (root) emitToUsers(recipients, 'message:updated', await presentMessage(root));
  } else {
    await Promise.all([
      ConversationModel.updateOne(
        { _id: conversationId },
        {
          lastMessageAt: created.createdAt,
          lastMessage: { body: previewOf(created), senderName: message.sender.name, createdAt: created.createdAt },
        },
      ),
      ConversationMemberModel.updateMany({ conversationId }, { lastMessageAt: created.createdAt }),
      ConversationMemberModel.updateMany({ conversationId, userId: { $ne: toId(userId) } }, { $inc: { unreadCount: 1 } }),
    ]);
  }
  emitToUsers(recipients, 'message:new', message);
  return message;
}

export async function listMessages(
  userId: string,
  conversationId: string,
  query: { cursor?: string; limit: number; threadRootId?: string },
): Promise<Page<Message>> {
  await requireMember(conversationId, userId);
  if (query.cursor && !isId(query.cursor)) throw badRequest('invalid_cursor', 'Invalid cursor');
  const filter: Record<string, unknown> = { conversationId, threadRootId: query.threadRootId ?? null };
  if (query.cursor) filter._id = { $lt: toId(query.cursor) };
  const rows = await MessageModel.find(filter)
    .sort({ _id: -1 })
    .limit(query.limit + 1)
    .lean();
  const page = toPage(rows, query.limit, (row) => String(row._id), (row) => row);
  return { data: await presentMessages(page.data), nextCursor: page.nextCursor };
}

/** Loads one message the user may see. Used by edit, delete and react. */
export async function requireMessage(userId: string, messageId: string): Promise<MessageDoc> {
  const message = isId(messageId) ? await MessageModel.findById(messageId).lean() : null;
  if (!message) throw notFound('Message');
  await requireMember(String(message.conversationId), userId).catch((error: unknown) => {
    // Not a member: answer as if the message did not exist. Anything else (a database failure) stays an error.
    throw error instanceof AppError && error.code === 'not_found' ? notFound('Message') : error;
  });
  return message;
}
