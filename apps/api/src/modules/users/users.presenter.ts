import type { Me, PublicUser } from '@campus/shared';
import { ProgramModel, SchoolModel } from '../university/university.models';
import type { UserDoc } from './user.model';

/**
 * Turns user documents into the public shape, loading each referenced school
 * and program once for the whole batch.
 */
export async function presentUsers(users: UserDoc[]): Promise<PublicUser[]> {
  const schoolIds = [...new Set(users.map((u) => u.schoolId).filter(Boolean).map(String))];
  const programIds = [...new Set(users.map((u) => u.programId).filter(Boolean).map(String))];
  const [schools, programs] = await Promise.all([
    schoolIds.length ? SchoolModel.find({ _id: { $in: schoolIds } }).lean() : [],
    programIds.length ? ProgramModel.find({ _id: { $in: programIds } }).lean() : [],
  ]);
  const schoolById = new Map(schools.map((s) => [String(s._id), s]));
  const programById = new Map(programs.map((p) => [String(p._id), p]));

  return users.map((user) => {
    const school = user.schoolId ? schoolById.get(String(user.schoolId)) : undefined;
    const program = user.programId ? programById.get(String(user.programId)) : undefined;
    return {
      id: String(user._id),
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      school: school ? { id: String(school._id), name: school.name, color: school.color } : null,
      program: program ? { id: String(program._id), name: program.name } : null,
      year: user.year,
      classSection: user.classSection,
      skills: user.skills,
      interests: user.interests,
      role: user.role,
    };
  });
}

export async function presentUser(user: UserDoc): Promise<PublicUser> {
  const [presented] = await presentUsers([user]);
  return presented!;
}

export async function presentMe(user: UserDoc): Promise<Me> {
  return { ...(await presentUser(user)), email: user.email, onboarded: user.onboarded };
}
