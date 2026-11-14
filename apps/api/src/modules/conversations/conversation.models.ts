import { Schema, model, type Types } from 'mongoose';
import type { ConversationType, MemberRole } from '@campus/shared';

export interface ConversationDoc {
  _id: Types.ObjectId;
  type: ConversationType;
  /** DMs only: the two user ids sorted and joined, so each pair has exactly one DM. */
  dmKey?: string;
  name: string;
  description: string;
  imageUrl: string | null;
  clubId: Types.ObjectId | null;
  lastMessageAt: Date;
  lastMessage: { body: string; senderName: string; createdAt: Date } | null;
  createdAt: Date;
}

const conversationSchema = new Schema<ConversationDoc>(
  {
    type: { type: String, enum: ['dm', 'group', 'club'], required: true },
    dmKey: { type: String },
    name: { type: String, default: '' },
    description: { type: String, default: '' },
    imageUrl: { type: String, default: null },
    clubId: { type: Schema.Types.ObjectId, ref: 'Club', default: null },
    lastMessageAt: { type: Date, default: () => new Date() },
    lastMessage: {
      type: new Schema({ body: String, senderName: String, createdAt: Date }, { _id: false }),
      default: null,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
// Partial: only DMs carry a dmKey. A plain unique index would treat every group
// and club conversation as having the same (missing) key and reject the second one.
conversationSchema.index({ dmKey: 1 }, { unique: true, partialFilterExpression: { type: 'dm' } });

export interface ConversationMemberDoc {
  _id: Types.ObjectId;
  conversationId: Types.ObjectId;
  userId: Types.ObjectId;
  role: MemberRole;
  lastReadMessageId: Types.ObjectId | null;
  /** Kept in step with new messages by atomic $inc, so the chat list needs no counting query. */
  unreadCount: number;
  /** Copy of the conversation's lastMessageAt, so "my chats, newest first" is one indexed query. */
  lastMessageAt: Date;
  joinedAt: Date;
}

const memberSchema = new Schema<ConversationMemberDoc>({
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['admin', 'member'], default: 'member' },
  lastReadMessageId: { type: Schema.Types.ObjectId, default: null },
  unreadCount: { type: Number, default: 0 },
  lastMessageAt: { type: Date, default: () => new Date() },
  joinedAt: { type: Date, default: () => new Date() },
});
memberSchema.index({ conversationId: 1, userId: 1 }, { unique: true });
memberSchema.index({ userId: 1, lastMessageAt: -1 });

export const ConversationModel = model<ConversationDoc>('Conversation', conversationSchema);
export const ConversationMemberModel = model<ConversationMemberDoc>('ConversationMember', memberSchema);

export const dmKeyFor = (a: string, b: string) => [a, b].sort().join(':');
