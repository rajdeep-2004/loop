import { Schema, model, type Types } from 'mongoose';
import type { Attachment } from '@campus/shared';

export interface MessageDoc {
  _id: Types.ObjectId;
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  clientMessageId: string;
  type: 'text' | 'image' | 'file';
  body: string;
  attachments: Attachment[];
  replyToId: Types.ObjectId | null;
  threadRootId: Types.ObjectId | null;
  threadReplyCount: number;
  reactions: { emoji: string; userIds: Types.ObjectId[] }[];
  editedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
}

const messageSchema = new Schema<MessageDoc>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    clientMessageId: { type: String, required: true },
    type: { type: String, enum: ['text', 'image', 'file'], default: 'text' },
    body: { type: String, default: '' },
    attachments: {
      type: [new Schema({ url: String, name: String, mimeType: String, size: Number }, { _id: false })],
      default: [],
    },
    replyToId: { type: Schema.Types.ObjectId, default: null },
    threadRootId: { type: Schema.Types.ObjectId, default: null },
    threadReplyCount: { type: Number, default: 0 },
    reactions: {
      type: [new Schema({ emoji: String, userIds: [Schema.Types.ObjectId] }, { _id: false })],
      default: [],
    },
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
// Paging through a conversation (or one thread) newest-first.
messageSchema.index({ conversationId: 1, threadRootId: 1, _id: -1 });
// Idempotency: a retried send with the same client id hits this index instead of creating a duplicate.
messageSchema.index({ senderId: 1, clientMessageId: 1 }, { unique: true });

export const MessageModel = model<MessageDoc>('Message', messageSchema);
