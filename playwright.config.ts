import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

import { defineConfig, devices } from '@playwright/test';

/** Key/value pairs of a dotenv file; empty when the file does not exist. */
function envFile(file: string): NodeJS.Dict<string> {
  try {
    return parseEnv(readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

/*
 * Environment for the dev server and the tests: `.env`, then `.env.e2e` on top,
 * then anything already set in the shell. The Blob token is blanked so the dev
 * server always keeps its data in a local file, which starts from the seed
 * data the tests assume (src/server/seed-data.ts).
 */
const merged: NodeJS.Dict<string> = {
  ...envFile('.env'),
  ...envFile('.env.e2e'),
  ...process.env,
  BLOB_READ_WRITE_TOKEN: '',
  DATA_FILE: '.data/e2e.json',
};

const env = Object.fromEntries(
  Object.entries(merged).filter(
    (kv): kv is [string, string] => typeof kv[1] === 'string',
  ),
);

// Read by the tests: the passcode for admin flows (skipped when unset) and the
// opt-in for tests that change data (E2E_WRITES=1).
for (const key of ['ADMIN_PASSCODE', 'E2E_WRITES']) {
  const value = merged[key];
  if (value !== undefined) process.env[key] ??= value;
}

const baseURL = merged.E2E_BASE_URL ?? 'http://localhost:3000';
const port = new URL(baseURL).port || '80';
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  // A dev server compiles on demand, so give the first paint some room.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: 'admin-writes.spec.ts',
    },
    {
      // The test person they add would change what the read-only tests count
      // (e.g. Anh's hidden children), so they only start once those finish.
      name: 'writes',
      use: { ...devices['Desktop Chrome'] },
      testMatch: 'admin-writes.spec.ts',
      dependencies: ['chromium'],
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: baseURL,
    env,
    // Locally an already running server (whatever store it uses) is reused.
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
