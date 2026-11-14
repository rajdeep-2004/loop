import { Schema, model, type Types } from 'mongoose';
import type { UserRole } from '@campus/shared';

export interface UserDoc {
  _id: Types.ObjectId;
  name: string;
  /** Lowercase words of the name, so a prefix of any word can use an index. */
  nameWords: string[];
  username: string;
  email: string;
  passwordHash: string;
  avatarUrl: string | null;
  bio: string;
  schoolId: Types.ObjectId | null;
  programId: Types.ObjectId | null;
  year: number | null;
  classSection: string | null;
  skills: string[];
  interests: string[];
  role: UserRole;
  onboarded: boolean;
  createdAt: Date;
}

const userSchema = new Schema<UserDoc>(
  {
    name: { type: String, required: true },
    nameWords: { type: [String], default: [], index: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    avatarUrl: { type: String, default: null },
    bio: { type: String, default: '' },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', default: null, index: true },
    programId: { type: Schema.Types.ObjectId, ref: 'Program', default: null },
    year: { type: Number, default: null },
    classSection: { type: String, default: null },
    skills: { type: [String], default: [], index: true },
    interests: { type: [String], default: [], index: true },
    role: { type: String, enum: ['student', 'university_admin'], default: 'student' },
    onboarded: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const UserModel = model<UserDoc>('User', userSchema);

export const toNameWords = (name: string) => name.toLowerCase().split(/\s+/).filter(Boolean);
