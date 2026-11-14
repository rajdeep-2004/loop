/**
 * Fixed-window counter kept in memory. Used for socket events, which the HTTP
 * rate-limit plugin does not see. Correct for a single API process.
 */
export function createRateLimiter(max: number, windowMs: number) {
  const windows = new Map<string, { start: number; count: number }>();
  return {
    /** Returns false when the key has used up its allowance for the current window. */
    allow(key: string, now = Date.now()): boolean {
      const current = windows.get(key);
      if (!current || now - current.start >= windowMs) {
        windows.set(key, { start: now, count: 1 });
        return true;
      }
      current.count += 1;
      return current.count <= max;
    },
    forget(key: string): void {
      windows.delete(key);
    },
  };
}
