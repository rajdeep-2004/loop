import type { Message, ReactionEmoji } from '@campus/shared';
import { conflict, forbidden, notFound } from '../../lib/errors';
import { toId } from '../../lib/db';
import { emitToUsers } from '../../realtime/gateway';
import { ConversationModel } from '../conversations/conversation.models';
import { memberIds } from '../conversations/conversations.service';
import { MessageModel, type MessageDoc } from './message.model';
import { presentMessage } from './messages.presenter';
import { previewOf, requireMessage } from './messages.service';

const deletedError = () => conflict('message_deleted', 'This message was deleted');

/**
 * Tells everyone about the new state of a message and returns it. Runs on every call, also when
 * the write was a repeat, so a retry after a half-finished attempt still repairs what was missed.
 */
async function publish(message: MessageDoc): Promise<Message> {
  const conversationId = String(message.conversationId);
  const [presented, recipients, previewChanged] = await Promise.all([
    presentMessage(message),
    memberIds(conversationId),
    refreshPreview(message),
  ]);
  emitToUsers(recipients, 'message:updated', presented);
  if (previewChanged) emitToUsers(recipients, 'conversation:changed', { conversationId });
  return presented;
}

/**
 * Rewrites the chat list preview if this message is still the newest one; returns whether it
 * changed. The filter on `lastMessageAt` is the guard: if a newer message arrived, nothing
 * matches. The text comes from the message as it is stored now, not from the caller's copy,
 * so an edit and a delete that finish in either order write the same preview.
 */
async function refreshPreview(message: MessageDoc): Promise<boolean> {
  if (message.threadRootId) return false;
  const current = await MessageModel.findById(message._id).lean();
  if (!current) return false;
  const body = previewOf(current);
  const result = await ConversationModel.updateOne(
    { _id: message.conversationId, lastMessageAt: message.createdAt, 'lastMessage.body': { $ne: body } },
    { 'lastMessage.body': body },
  );
  return result.modifiedCount > 0;
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
  // The same text again (a retry) changes nothing and does not mark the message edited.
  if (message.body === body) return publish(message);

  // `deletedAt: null` in the filter: an edit that races a delete loses instead of restoring the text.
  const updated = await MessageModel.findOneAndUpdate(
    { _id: message._id, senderId: message.senderId, deletedAt: null },
    { body, editedAt: new Date() },
    { returnDocument: 'after' },
  ).lean();
  if (!updated) throw deletedError();
  return publish(updated);
}

/** Soft delete: the message keeps its place in the chat, its content is erased. Safe to repeat. */
export async function deleteMessage(userId: string, messageId: string): Promise<Message> {
  const message = await requireOwnMessage(userId, messageId);
  if (message.deletedAt) return publish(message);

  const updated = await MessageModel.findOneAndUpdate(
    { _id: message._id, senderId: message.senderId, deletedAt: null },
    { body: '', attachments: [], reactions: [], editedAt: null, deletedAt: new Date() },
    { returnDocument: 'after' },
  ).lean();
  // No match: another request deleted it between the read and the write.
  const current = updated ?? (await MessageModel.findById(message._id).lean());
  if (!current) throw notFound('Message');
  return publish(current);
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
          // A message stored without the field (inserted outside the app) counts as having no reactions.
          input: { $ifNull: ['$reactions', []] },
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
  return publish(updated);
}

/** One reaction per member per message: choosing an emoji replaces the member's previous one. Safe to repeat. */
export const setReaction = (userId: string, messageId: string, emoji: ReactionEmoji): Promise<Message> =>
  changeReaction(userId, messageId, emoji);

/** Removes the member's reaction, if any. Safe to repeat. */
export const clearReaction = (userId: string, messageId: string): Promise<Message> => changeReaction(userId, messageId, null);
