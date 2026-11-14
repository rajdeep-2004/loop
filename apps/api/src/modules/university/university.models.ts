import { Schema, model, type Types } from 'mongoose';

export interface SchoolDoc {
  _id: Types.ObjectId;
  name: string;
  description: string;
  /** Hex color used across the app to mark this school. */
  color: string;
}

export interface ProgramDoc {
  _id: Types.ObjectId;
  schoolId: Types.ObjectId;
  name: string;
  /** Length of the program in years. */
  years: number;
  /** Class section labels, e.g. ["A", "B"]. */
  sections: string[];
}

const schoolSchema = new Schema<SchoolDoc>({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  color: { type: String, required: true },
});

const programSchema = new Schema<ProgramDoc>({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  name: { type: String, required: true },
  years: { type: Number, required: true },
  sections: { type: [String], default: [] },
});

export const SchoolModel = model<SchoolDoc>('School', schoolSchema);
export const ProgramModel = model<ProgramDoc>('Program', programSchema);
