import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
      MONGO_URI: process.env.TEST_MONGO_URI ?? 'mongodb://127.0.0.1:27017/nanoskool_test',
    },
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
