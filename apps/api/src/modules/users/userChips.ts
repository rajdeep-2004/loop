import type { UserChip } from '@campus/shared';
import { SchoolModel } from '../university/university.models';
import { UserModel } from './user.model';

const DELETED_USER: Omit<UserChip, 'id'> = { name: 'Deleted user', username: 'deleted', avatarUrl: null, color: null };

/** Loads the small user cards for a set of ids in two queries, whatever the size of the set. */
export async function loadUserChips(ids: Iterable<string>): Promise<Map<string, UserChip>> {
  const unique = [...new Set(ids)];
  const chips = new Map<string, UserChip>();
  if (unique.length === 0) return chips;
  const users = await UserModel.find({ _id: { $in: unique } })
    .select('name username avatarUrl schoolId')
    .lean();
  const schoolIds = [...new Set(users.map((u) => u.schoolId).filter(Boolean).map(String))];
  const schools = schoolIds.length ? await SchoolModel.find({ _id: { $in: schoolIds } }).select('color').lean() : [];
  const colorBySchool = new Map(schools.map((s) => [String(s._id), s.color]));
  for (const user of users) {
    chips.set(String(user._id), {
      id: String(user._id),
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl,
      color: user.schoolId ? (colorBySchool.get(String(user.schoolId)) ?? null) : null,
    });
  }
  for (const id of unique) if (!chips.has(id)) chips.set(id, { id, ...DELETED_USER });
  return chips;
}
