import { z } from 'zod';
import { LIMITS } from './limits';

/** A MongoDB ObjectId as a 24-char hex string. */
export const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const tag = z
  .string()
  .trim()
  .min(1)
  .max(LIMITS.tagMax)
  .transform((value) => value.toLowerCase());

export const tags = z
  .array(tag)
  .max(LIMITS.tagsMax)
  .transform((values) => [...new Set(values)]);

export const pageQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(LIMITS.pageSizeMax).default(LIMITS.pageSizeDefault),
});

export type Page<T> = { data: T[]; nextCursor: string | null };
export type ApiError = { error: { code: string; message: string } };
