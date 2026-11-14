import type { ConversationDetail, ConversationSummary, Page } from '@campus/shared';
import { badRequest, isDuplicateKeyError, notFound } from '../../lib/errors';
import { isId, toId } from '../../lib/db';
import { toPage } from '../../lib/paging';
import { emitToUsers, isOnline } from '../../realtime/gateway';
import { MessageModel } from '../messages/message.model';
import { UserModel } from '../users/user.model';
import { loadUserChips } from '../users/userChips';
import {
  ConversationMemberModel,
  ConversationModel,
  dmKeyFor,
  type ConversationDoc,
  type ConversationMemberDoc,
} from './conversation.models';

/** A DM with no messages yet carries this date, which keeps it out of both students' chat lists. */
const NEVER = new Date(0);

/**
 * The gate for everything inside a conversation. Non-members get the same
 * "not found" as a conversation that does not exist, so ids cannot be probed.
 */
export async function requireMember(conversationId: string, userId: string): Promise<ConversationMemberDoc> {
  const member = isId(conversationId)
    ? await ConversationMemberModel.findOne({ conversationId, userId }).lean()
    : null;
  if (!member) throw notFound('Conversation');
  return member;
}

export async function memberIds(conversationId: string): Promise<string[]> {
  const members = await ConversationMemberModel.find({ conversationId }).select('userId').lean();
  return members.map((member) => String(member.userId));
}

/** Tells every member's app to refresh this conversation (name, members, roles changed). */
export async function notifyChanged(conversationId: string): Promise<void> {
  emitToUsers(await memberIds(conversationId), 'conversation:changed', { conversationId });
}

const peerIdOf = (conversation: ConversationDoc, userId: string) =>
  conversation.dmKey?.split(':').find((id) => id !== userId) ?? null;

async function present(members: ConversationMemberDoc[], userId: string): Promise<ConversationSummary[]> {
  const ids = members.map((member) => member.conversationId);
  const [conversations, counts] = await Promise.all([
    ConversationModel.find({ _id: { $in: ids } }).lean(),
    ConversationMemberModel.aggregate<{ _id: unknown; count: number }>([
      { $match: { conversationId: { $in: ids } } },
      { $group: { _id: '$conversationId', count: { $sum: 1 } } },
    ]),
  ]);
  const byId = new Map(conversations.map((c) => [String(c._id), c]));
  const countById = new Map(counts.map((c) => [String(c._id), c.count]));
  const peerIds = conversations.map((c) => (c.type === 'dm' ? peerIdOf(c, userId) : null)).filter((id): id is string => !!id);
  const chips = await loadUserChips(peerIds);

  const summaries: ConversationSummary[] = [];
  for (const member of members) {
    const conversation = byId.get(String(member.conversationId));
    if (!conversation) continue;
    const peerId = conversation.type === 'dm' ? peerIdOf(conversation, userId) : null;
    const peer = peerId ? chips.get(peerId)! : null;
    summaries.push({
      id: String(conversation._id),
      type: conversation.type,
      title: peer ? peer.name : conversation.name,
      imageUrl: peer ? peer.avatarUrl : conversation.imageUrl,
      color: peer?.color ?? null,
      peer: peer ? { ...peer, online: isOnline(peer.id) } : null,
      clubId: conversation.clubId ? String(conversation.clubId) : null,
      lastMessage: conversation.lastMessage
        ? { ...conversation.lastMessage, createdAt: conversation.lastMessage.createdAt.toISOString() }
        : null,
      unreadCount: member.unreadCount,
      memberCount: countById.get(String(conversation._id)) ?? 0,
      myRole: member.role,
    });
  }
  return summaries;
}

/**
 * Opens the one DM between two students, creating it on first use. Safe to call
 * twice at once: the partial unique index on dmKey lets only one insert win, and
 * the member rows are upserts, so a half-finished earlier attempt is repaired.
 */
export async function startDm(userId: string, otherId: string): Promise<ConversationSummary> {
  if (userId === otherId) throw badRequest('cannot_message_self', 'You cannot message yourself');
  if (!(await UserModel.exists({ _id: otherId }))) throw notFound('User');
  const dmKey = dmKeyFor(userId, otherId);

  let conversation = await ConversationModel.findOne({ type: 'dm', dmKey }).lean();
  if (!conversation) {
    try {
      conversation = (await ConversationModel.create({ type: 'dm', dmKey, lastMessageAt: NEVER })).toObject();
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      conversation = await ConversationModel.findOne({ type: 'dm', dmKey }).lean();
    }
  }
  if (!conversation) throw notFound('Conversation');

  await Promise.all(
    [userId, otherId].map((id) =>
      ConversationMemberModel.updateOne(
        { conversationId: conversation._id, userId: id },
        { $setOnInsert: { role: 'member', lastMessageAt: conversation.lastMessageAt } },
        { upsert: true },
      ),
    ),
  );
  const member = await requireMember(String(conversation._id), userId);
  const [summary] = await present([member], userId);
  return summary!;
}

export async function listConversations(
  userId: string,
  query: { cursor?: string; limit: number },
): Promise<Page<ConversationSummary>> {
  const before = query.cursor ? new Date(Number(query.cursor)) : null;
  if (before && Number.isNaN(before.getTime())) throw badRequest('invalid_cursor', 'Invalid cursor');
  const members = await ConversationMemberModel.find({
    userId,
    lastMessageAt: before ? { $gt: NEVER, $lt: before } : { $gt: NEVER },
  })
    .sort({ lastMessageAt: -1 })
    .limit(query.limit + 1)
    .lean();
  const page = toPage(members, query.limit, (m) => String(m.lastMessageAt.getTime()), (m) => m);
  return { data: await present(page.data, userId), nextCursor: page.nextCursor };
}

export async function getConversation(userId: string, conversationId: string): Promise<ConversationDetail> {
  const member = await requireMember(conversationId, userId);
  const [[summary], conversation, others] = await Promise.all([
    present([member], userId),
    ConversationModel.findById(conversationId).select('description').lean(),
    ConversationMemberModel.find({ conversationId, userId: { $ne: toId(userId) } })
      .select('userId lastReadMessageId')
      .lean(),
  ]);
  if (!summary || !conversation) throw notFound('Conversation');
  return {
    ...summary,
    description: conversation.description,
    readBy: others.map((other) => ({
      userId: String(other.userId),
      messageId: other.lastReadMessageId ? String(other.lastReadMessageId) : null,
    })),
  };
}

/** Total unread messages across all chats, for the tab badge. */
export async function unreadTotal(userId: string): Promise<number> {
  const [row] = await ConversationMemberModel.aggregate<{ total: number }>([
    { $match: { userId: toId(userId), unreadCount: { $gt: 0 } } },
    { $group: { _id: null, total: { $sum: '$unreadCount' } } },
  ]);
  return row?.total ?? 0;
}

/**
 * Moves the reader's marker forward, never backward, and recounts what is still
 * unread after it, so a message that arrives during the call is not lost.
 */
export async function markRead(userId: string, conversationId: string, messageId: string): Promise<void> {
  const member = await requireMember(conversationId, userId);
  const message = await MessageModel.exists({ _id: messageId, conversationId });
  if (!message) throw notFound('Message');
  const marker = toId(messageId);
  const moved = await ConversationMemberModel.updateOne(
    { _id: member._id, $or: [{ lastReadMessageId: null }, { lastReadMessageId: { $lt: marker } }] },
    { lastReadMessageId: marker },
  );
  const current = moved.modifiedCount ? marker : (member.lastReadMessageId ?? marker);
  const unreadCount = await MessageModel.countDocuments({
    conversationId,
    threadRootId: null,
    senderId: { $ne: toId(userId) },
    _id: { $gt: current },
  });
  await ConversationMemberModel.updateOne({ _id: member._id }, { unreadCount });
  if (moved.modifiedCount) {
    emitToUsers(await memberIds(conversationId), 'conversation:read', { conversationId, userId, messageId });
  }
}
