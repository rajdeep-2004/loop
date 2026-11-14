import { LIMITS, type Message } from '@campus/shared';
import { loadUserChips } from '../users/userChips';
import { MessageModel, type MessageDoc } from './message.model';

/** Turns message documents into the API shape. Senders and quoted messages are loaded once per batch. */
export async function presentMessages(messages: MessageDoc[]): Promise<Message[]> {
  const replyIds = [...new Set(messages.map((m) => m.replyToId).filter(Boolean).map(String))];
  const quoted = replyIds.length
    ? await MessageModel.find({ _id: { $in: replyIds } }).select('body senderId deletedAt attachments').lean()
    : [];
  const quotedById = new Map(quoted.map((q) => [String(q._id), q]));
  const chips = await loadUserChips([...messages, ...quoted].map((m) => String(m.senderId)));

  return messages.map((message) => {
    const deleted = message.deletedAt !== null;
    const quote = message.replyToId ? quotedById.get(String(message.replyToId)) : undefined;
    return {
      id: String(message._id),
      conversationId: String(message.conversationId),
      clientMessageId: message.clientMessageId,
      sender: chips.get(String(message.senderId))!,
      type: message.type,
      // A deleted message keeps its place in the chat but loses its content.
      body: deleted ? '' : message.body,
      attachments: deleted ? [] : message.attachments,
      replyTo: quote
        ? {
            id: String(quote._id),
            body: quote.deletedAt ? '' : (quote.body || quote.attachments[0]?.name || '').slice(0, LIMITS.replyPreviewMax),
            senderName: chips.get(String(quote.senderId))!.name,
            deleted: quote.deletedAt !== null,
          }
        : null,
      threadRootId: message.threadRootId ? String(message.threadRootId) : null,
      threadReplyCount: message.threadReplyCount,
      reactions: deleted ? [] : message.reactions.map((r) => ({ emoji: r.emoji, userIds: r.userIds.map(String) })),
      edited: !deleted && message.editedAt !== null,
      deleted,
      createdAt: message.createdAt.toISOString(),
    };
  });
}

export async function presentMessage(message: MessageDoc): Promise<Message> {
  const [presented] = await presentMessages([message]);
  return presented!;
}
