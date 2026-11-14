import type { Message, ReactionEmoji } from '@campus/shared';
import { conflict, forbidden, notFound } from '../../lib/errors';
import { toId } from '../../lib/db';
import { emitToUsers } from '../../realtime/gateway';
import { ConversationModel } from '../conversations/conversation.models';
import { memberIds } from '../conversations/conversations.service';
import { MessageModel, type MessageDoc } from './message.model';
import { presentMessage } from './messages.presenter';
import { DELETED_PREVIEW, previewOf, requireMessage } from './messages.service';

const deletedError = () => conflict('message_deleted', 'This message was deleted');

/** Sends the new state of a message to every member of its conversation and returns it. */
async function broadcast(message: MessageDoc): Promise<Message> {
  const presented = await presentMessage(message);
  emitToUsers(await memberIds(String(message.conversationId)), 'message:updated', presented);
  return presented;
}

/**
 * Rewrites the chat list preview if this message is still the newest one. The filter on
 * `lastMessageAt` is the guard: if a newer message arrived meanwhile, nothing matches.
 */
async function refreshPreview(message: MessageDoc, body: string): Promise<void> {
  if (message.threadRootId) return;
  const conversationId = String(message.conversationId);
  const result = await ConversationModel.updateOne(
    { _id: message.conversationId, lastMessageAt: message.createdAt },
    { 'lastMessage.body': body },
  );
  if (result.modifiedCount) emitToUsers(await memberIds(conversationId), 'conversation:changed', { conversationId });
}

/** Loads a message the user may see and checks that they wrote it. */
async function requireOwnMessage(userId: string, messageId: string): Promise<MessageDoc> {
  const message = await requireMessage(userId, messageId);
  if (String(message.senderId) !== userId) throw forbidden('You can only change your own messages');
  return message;
}

export async function editMessage(userId: string, messageId: string, body: string): Promise<Message> {
  const message = await requireOwnMessage(userId, messageId);
  if (message.deletedAt) throw deletedError();
  if (message.body === body) return presentMessage(message);

  // `deletedAt: null` in the filter: an edit that races a delete loses instead of restoring the text.
  const updated = await MessageModel.findOneAndUpdate(
    { _id: message._id, senderId: message.senderId, deletedAt: null },
    { body, editedAt: new Date() },
    { returnDocument: 'after' },
  ).lean();
  if (!updated) throw deletedError();

  await refreshPreview(updated, previewOf(updated));
  return broadcast(updated);
}

/** Soft delete: the message keeps its place in the chat, its content is erased. Safe to repeat. */
export async function deleteMessage(userId: string, messageId: string): Promise<Message> {
  const message = await requireOwnMessage(userId, messageId);
  if (message.deletedAt) return presentMessage(message);

  const updated = await MessageModel.findOneAndUpdate(
    { _id: message._id, senderId: message.senderId, deletedAt: null },
    { body: '', reactions: [], deletedAt: new Date() },
    { returnDocument: 'after' },
  ).lean();
  if (!updated) {
    // Another request deleted it between the read and the write.
    const current = await MessageModel.findById(message._id).lean();
    if (!current) throw notFound('Message');
    return presentMessage(current);
  }

  await refreshPreview(updated, DELETED_PREVIEW);
  return broadcast(updated);
}

/**
 * Builds a one-statement update that takes the user out of every reaction, drops groups left
 * empty, and then (when `emoji` is given) adds the user to that emoji's group. MongoDB runs
 * an update pipeline atomically per document, so simultaneous reactions cannot interleave.
 */
function reactionPipeline(userId: string, emoji: ReactionEmoji | null) {
  const user = toId(userId);
  const others = {
    $filter: {
      input: {
        $map: {
          input: '$reactions',
          as: 'r',
          in: { emoji: '$$r.emoji', userIds: { $filter: { input: '$$r.userIds', as: 'u', cond: { $ne: ['$$u', user] } } } },
        },
      },
      as: 'r',
      cond: { $gt: [{ $size: '$$r.userIds' }, 0] },
    },
  };
  if (emoji === null) return [{ $set: { reactions: others } }];

  // $literal: the emoji is data, never a field path, whatever characters it contains.
  const chosen = { $literal: emoji };
  const joined = {
    $map: {
      input: '$$others',
      as: 'r',
      in: {
        $cond: [{ $eq: ['$$r.emoji', chosen] }, { emoji: '$$r.emoji', userIds: { $concatArrays: ['$$r.userIds', [user]] } }, '$$r'],
      },
    },
  };
  const started = { $concatArrays: ['$$others', [{ emoji: chosen, userIds: [user] }]] };
  return [
    {
      $set: {
        reactions: { $let: { vars: { others }, in: { $cond: [{ $in: [chosen, '$$others.emoji'] }, joined, started] } } },
      },
    },
  ];
}

async function changeReaction(userId: string, messageId: string, emoji: ReactionEmoji | null): Promise<Message> {
  const message = await requireMessage(userId, messageId);
  if (message.deletedAt) throw deletedError();
  const updated = await MessageModel.findOneAndUpdate({ _id: message._id, deletedAt: null }, reactionPipeline(userId, emoji), {
    returnDocument: 'after',
    updatePipeline: true,
  }).lean();
  if (!updated) throw deletedError();
  return broadcast(updated);
}

/** One reaction per member per message: choosing an emoji replaces the member's previous one. Safe to repeat. */
export const setReaction = (userId: string, messageId: string, emoji: ReactionEmoji): Promise<Message> =>
  changeReaction(userId, messageId, emoji);

/** Removes the member's reaction, if any. Safe to repeat. */
export const clearReaction = (userId: string, messageId: string): Promise<Message> => changeReaction(userId, messageId, null);
