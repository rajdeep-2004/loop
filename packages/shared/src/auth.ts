import { z } from 'zod';
import { LIMITS } from './limits';

export const username = z
  .string()
  .trim()
  .min(LIMITS.usernameMin)
  .max(LIMITS.usernameMax)
  .regex(/^[a-zA-Z0-9_.]+$/, 'Use letters, numbers, dots and underscores only')
  .transform((value) => value.toLowerCase());

export const signupInput = z.object({
  name: z.string().trim().min(1).max(LIMITS.nameMax),
  username,
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(LIMITS.passwordMin).max(LIMITS.passwordMax),
});
export type SignupInput = z.input<typeof signupInput>;

export const loginInput = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(LIMITS.passwordMax),
});
export type LoginInput = z.input<typeof loginInput>;

export const refreshInput = z.object({ refreshToken: z.string().min(1).max(200) });
export type RefreshInput = z.infer<typeof refreshInput>;
