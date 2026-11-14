import { defineConfig } from 'vitest/config';

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
