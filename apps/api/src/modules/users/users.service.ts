import type { Me, OnboardingInput, PublicUser } from '@campus/shared';
import { badRequest, notFound } from '../../lib/errors';
import { isId } from '../../lib/db';
import { ProgramModel, SchoolModel } from '../university/university.models';
import { PUBLIC_FILE_PREFIX } from '../uploads/uploads.service';
import { UserModel, toNameWords } from './user.model';
import { presentMe, presentUser } from './users.presenter';

type ProfileChanges = {
  name?: string;
  bio?: string;
  avatarUrl?: string | null;
  skills?: string[];
  interests?: string[];
};

export async function getMe(userId: string): Promise<Me> {
  const user = await UserModel.findById(userId).lean();
  if (!user) throw notFound('User');
  return presentMe(user);
}

export async function getUser(id: string): Promise<PublicUser> {
  const user = isId(id) ? await UserModel.findById(id).lean() : null;
  if (!user) throw notFound('User');
  return presentUser(user);
}

/** Attaches the student to the university structure. Every reference is checked against the database. */
export async function completeOnboarding(userId: string, input: OnboardingInput): Promise<Me> {
  const [school, program] = await Promise.all([
    SchoolModel.findById(input.schoolId).lean(),
    ProgramModel.findById(input.programId).lean(),
  ]);
  if (!school) throw badRequest('invalid_school', 'That school does not exist');
  if (!program || String(program.schoolId) !== String(school._id)) {
    throw badRequest('invalid_program', 'That program does not belong to the chosen school');
  }
  if (input.year > program.years) {
    throw badRequest('invalid_year', `${program.name} has ${program.years} years`);
  }
  if (!program.sections.includes(input.classSection)) {
    throw badRequest('invalid_class', 'That class section does not exist in this program');
  }
  const user = await UserModel.findByIdAndUpdate(
    userId,
    {
      schoolId: school._id,
      programId: program._id,
      year: input.year,
      classSection: input.classSection,
      onboarded: true,
    },
    { returnDocument: 'after' },
  ).lean();
  if (!user) throw notFound('User');
  return presentMe(user);
}

export async function updateProfile(userId: string, changes: ProfileChanges): Promise<Me> {
  if (changes.avatarUrl && !changes.avatarUrl.startsWith(PUBLIC_FILE_PREFIX)) {
    throw badRequest('invalid_avatar', 'Avatar must be an image uploaded to Campus');
  }
  const update: Record<string, unknown> = { ...changes };
  if (changes.name !== undefined) update.nameWords = toNameWords(changes.name);
  const user = await UserModel.findByIdAndUpdate(userId, update, { returnDocument: 'after' }).lean();
  if (!user) throw notFound('User');
  return presentMe(user);
}
