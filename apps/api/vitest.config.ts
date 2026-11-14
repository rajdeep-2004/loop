import { defineConfig } from 'vitest/config';

// Vitest 5's failure reporter uses Map.groupBy, which Node 20 lacks. Without this,
// a failing test prints a reporter crash instead of the assertion.
const mapWithGroupBy = Map as unknown as { groupBy?: <T, K>(items: Iterable<T>, keyOf: (item: T) => K) => Map<K, T[]> };
mapWithGroupBy.groupBy ??= (items, keyOf) => {
  const groups = new Map();
  for (const item of items) {
    const key = keyOf(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
};

export default defineConfig({
  test: {
    environment: 'node',
    // Test files share one database, so they run one after another.
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/campus_test',
      JWT_SECRET: 'test-secret-test-secret-test-secret',
      UPLOAD_DIR: './.test-uploads',
      AUTH_RATE_LIMIT_MAX: '1000',
    },
  },
});
