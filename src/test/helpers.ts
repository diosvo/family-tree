import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, onTestFinished } from 'vitest';

import { HttpError } from '@/server/http-error';

/** A valid `SESSION_SECRET` (at least 32 characters). */
export const SESSION_SECRET = 'a-session-secret-of-at-least-32-chars';

/** A temporary directory, removed when the current test finishes. */
export async function tempDir() {
  const dir = await mkdtemp(join(tmpdir(), 'family-test-'));
  onTestFinished(() => rm(dir, { recursive: true, force: true }));

  return dir;
}

/** The HTTP status `run` throws with, or undefined when it does not throw. */
export function statusOf(run: () => unknown) {
  try {
    run();
  } catch (error) {
    if (error instanceof HttpError) return error.statusCode;
    throw error;
  }

  return undefined;
}

/** Expect `promise` to reject with an error carrying `statusCode`. */
export const rejectsWith = (promise: Promise<unknown>, statusCode: number) =>
  expect(promise).rejects.toMatchObject({ statusCode });
