import { Schema, model, type Types } from 'mongoose';

export interface SessionDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  /** SHA-256 of the refresh token. The token itself is never stored. */
  tokenHash: string;
  expiresAt: Date;
}

const sessionSchema = new Schema<SessionDoc>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  // TTL index: MongoDB deletes expired sessions on its own.
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export const SessionModel = model<SessionDoc>('Session', sessionSchema);
