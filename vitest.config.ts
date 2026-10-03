import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const testFile = (name: string) =>
  fileURLToPath(new URL(`./src/test/${name}`, import.meta.url));

/*
 * Unit tests for the pure logic (`*.test.ts` under src/). Kept apart from
 * vite.config.ts so the app's server plugins do not load for tests; the
 * browser flows are covered by Playwright in e2e/.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ['src/**/*.test.ts'],
    // TanStack Start is replaced by plain functions and an inspectable request.
    alias: [
      {
        find: /^@tanstack\/react-start$/,
        replacement: testFile('start-mock.ts'),
      },
      {
        find: /^@tanstack\/react-start\/server$/,
        replacement: testFile('start-server-mock.ts'),
      },
    ],
    environment: 'node',
    // Lunar dates are computed for Vietnam; pin the zone so results do not
    // depend on the machine running the tests.
    env: {
      TZ: 'Asia/Ho_Chi_Minh',
      // Never reach the production store from a test.
      BLOB_STORE_ID: '',
      BLOB_READ_WRITE_TOKEN: '',
    },
    coverage: {
      provider: 'v8',
      // The logic modules; React components and pages are covered by e2e/.
      include: ['src/lib/**/*.ts', 'src/server/**/*.ts'],
      // Seed data is data, not logic.
      exclude: ['**/*.test.ts', 'src/server/seed-data.ts'],
      reporter: ['text', 'html'],
      thresholds: { 100: true },
    },
  },
});
