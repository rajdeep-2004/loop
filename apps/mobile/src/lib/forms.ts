import type { z } from 'zod';

export type FieldErrors = Record<string, string>;

/** Validates form values with a shared schema and returns one message per failing field. */
export function validateForm<S extends z.ZodType>(
  schema: S,
  values: unknown,
): { ok: true; data: z.output<S> } | { ok: false; errors: FieldErrors } {
  const result = schema.safeParse(values);
  if (result.success) return { ok: true, data: result.data };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? 'form');
    errors[field] ??= issue.message;
  }
  return { ok: false, errors };
}

/** "react, Node , ai" -> ["react", "Node", "ai"] */
export const splitTags = (text: string) =>
  text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
