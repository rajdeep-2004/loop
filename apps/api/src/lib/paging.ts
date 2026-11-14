import type { Page } from '@campus/shared';

/**
 * Cursor paging helper. Callers fetch `limit + 1` rows; if the extra row exists
 * there is another page and the cursor is taken from the last returned row.
 */
export function toPage<T, R>(rows: T[], limit: number, cursorOf: (row: T) => string, map: (row: T) => R): Page<R> {
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const last = pageRows[pageRows.length - 1];
  return { data: pageRows.map(map), nextCursor: hasMore && last ? cursorOf(last) : null };
}

/** Escapes user text so it can be used inside a regular expression. */
export const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
