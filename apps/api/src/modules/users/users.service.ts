import type { Me, OnboardingInput, Page, PublicUser } from '@campus/shared';
import { badRequest, notFound } from '../../lib/errors';
import { isId, toId } from '../../lib/db';
import { escapeRegex, toPage } from '../../lib/paging';
import { isOnline } from '../../realtime/gateway';
import { ProgramModel, SchoolModel } from '../university/university.models';
import { PUBLIC_FILE_PREFIX } from '../uploads/uploads.service';
import { UserModel, toNameWords } from './user.model';
import { presentMe, presentUser, presentUsers } from './users.presenter';

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

export async function getUser(id: string): Promise<PublicUser & { online: boolean }> {
  const user = isId(id) ? await UserModel.findById(id).lean() : null;
  if (!user) throw notFound('User');
  return { ...(await presentUser(user)), online: isOnline(id) };
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

export type PeopleFilter = {
  q?: string;
  schoolId?: string;
  programId?: string;
  year?: number;
  tag?: string;
  cursor?: string;
  limit: number;
};

/**
 * People search. Text matches the start of any word of the name, or the start of
 * the username ("raj" and "san" both find Rajdeep Sanyal). Both use indexes
 * because the pattern is anchored. A tag matches a skill or an interest exactly.
 */
export async function searchPeople(userId: string, filter: PeopleFilter): Promise<Page<PublicUser>> {
  const offset = filter.cursor ? Number(filter.cursor) : 0;
  if (!Number.isInteger(offset) || offset < 0) throw badRequest('invalid_cursor', 'Invalid cursor');

  const conditions: Record<string, unknown>[] = [{ _id: { $ne: toId(userId) } }, { onboarded: true }, { role: 'student' }];
  const words = (filter.q ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    const prefix = new RegExp(`^${escapeRegex(words[0]!)}`);
    conditions.push({ $or: [{ nameWords: prefix }, { username: prefix }] });
  } else {
    for (const word of words) conditions.push({ nameWords: new RegExp(`^${escapeRegex(word)}`) });
  }
  if (filter.schoolId) conditions.push({ schoolId: toId(filter.schoolId) });
  if (filter.programId) conditions.push({ programId: toId(filter.programId) });
  if (filter.year) conditions.push({ year: filter.year });
  if (filter.tag) conditions.push({ $or: [{ skills: filter.tag }, { interests: filter.tag }] });

  const rows = await UserModel.find({ $and: conditions })
    .sort({ name: 1, _id: 1 })
    .skip(offset)
    .limit(filter.limit + 1)
    .lean();
  const page = toPage(rows, filter.limit, () => String(offset + filter.limit), (row) => row);
  return { data: await presentUsers(page.data), nextCursor: page.nextCursor };
}
