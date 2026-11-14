import type { z } from 'zod';
import { AppError } from './errors';

/** Validates untrusted input. Throws a 400 AppError naming the first bad field. */
export function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const path = issue?.path.join('.') ?? '';
  const message = issue ? (path ? `${path}: ${issue.message}` : issue.message) : 'Invalid input';
  throw new AppError('validation_error', 400, message);
}
