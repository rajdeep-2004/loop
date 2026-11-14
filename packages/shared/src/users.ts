import { z } from 'zod';
import { objectId, pageQuery, tags } from './common';
import { LIMITS } from './limits';

export const onboardingInput = z.object({
  schoolId: objectId,
  programId: objectId,
  year: z.number().int().min(1).max(LIMITS.maxYear),
  classSection: z.string().trim().min(1).max(20),
});
export type OnboardingInput = z.infer<typeof onboardingInput>;

export const updateProfileInput = z
  .object({
    name: z.string().trim().min(1).max(LIMITS.nameMax),
    bio: z.string().trim().max(LIMITS.bioMax),
    avatarUrl: z.string().max(300).nullable(),
    skills: tags,
    interests: tags,
  })
  .partial();
export type UpdateProfileInput = z.input<typeof updateProfileInput>;

export const peopleQuery = pageQuery.extend({
  q: z.string().trim().max(60).optional(),
  schoolId: objectId.optional(),
  programId: objectId.optional(),
  year: z.coerce.number().int().min(1).max(LIMITS.maxYear).optional(),
  tag: z.string().trim().toLowerCase().max(LIMITS.tagMax).optional(),
});

export type UserRole = 'student' | 'university_admin';

/** What any signed-in student may see about another student. */
export type PublicUser = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  bio: string;
  school: { id: string; name: string; color: string } | null;
  program: { id: string; name: string } | null;
  year: number | null;
  classSection: string | null;
  skills: string[];
  interests: string[];
  role: UserRole;
};

/** The signed-in user's own record. */
export type Me = PublicUser & { email: string; onboarded: boolean };

export type AuthResult = { user: Me; accessToken: string; refreshToken: string };
