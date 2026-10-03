import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { SESSION_SECRET, rejectsWith } from '@/test/helpers';
import { cookies, getRequestIP } from '@/test/start-server-mock';

import {
  addPerson,
  addSuggestion,
  exportFamily,
  loadFamily,
  login,
  logout,
  removePerson,
  resolveSuggestion,
  updatePerson,
} from './family';
import { SCHEMA_VERSION } from './store';
import { MAX_FAILURES } from './throttle';

/*
 * The server functions end to end, minus HTTP: TanStack Start is replaced by
 * plain function calls (src/test/start-mock.ts, aliased in vitest.config.ts)
 * and the data lives in a temporary file.
 */

// No real pause after a wrong passcode.
vi.mock('node:timers/promises', () => ({ setTimeout: async () => {} }));

const PASSCODE = 'open sesame';
let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'family-fns-'));
  vi.stubEnv('DATA_FILE', join(dir, 'family.json'));
  vi.stubEnv('SESSION_SECRET', SESSION_SECRET);
  vi.stubEnv('ADMIN_PASSCODE', PASSCODE);
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

beforeEach(() => {
  cookies.clear();
  getRequestIP.mockReturnValue('10.0.0.1');
});

const signIn = async () => expect(await login({ data: PASSCODE })).toBe('ok');

describe('login and logout', () => {
  it('signs the admin in and out', async () => {
    expect((await loadFamily()).isAdmin).toBe(false);
    await signIn();
    expect((await loadFamily()).isAdmin).toBe(true);
    await logout();
    expect((await loadFamily()).isAdmin).toBe(false);
  });

  it('says when the passcode is wrong, then locks the client out', async () => {
    getRequestIP.mockReturnValue('10.0.0.2');

    for (let i = 1; i < MAX_FAILURES; i++) {
      expect(await login({ data: 'guess' })).toBe('wrong');
    }

    expect(await login({ data: 'guess' })).toBe('locked');
    // Even the right passcode, until the lock expires
    expect(await login({ data: PASSCODE })).toBe('locked');
    expect(cookies.size).toBe(0);
  });

  it('counts clients without an address together', async () => {
    getRequestIP.mockReturnValue(undefined);
    expect(await login({ data: 'guess' })).toBe('wrong');
    await signIn();
  });

  it('rejects an empty passcode', async () => {
    await rejectsWith(login({ data: ' ' }), 400);
  });
});

describe('suggestions', () => {
  it('stores them for the admin only, newest first', async () => {
    vi.useFakeTimers({ now: 1000, toFake: ['Date'] });

    try {
      const base = { personId: 'p1', author: 'Lan', field: 'other' } as const;

      expect(await addSuggestion({ data: { ...base, value: 'first' } })).toBe(
        true,
      );

      vi.setSystemTime(2000);
      await addSuggestion({ data: { ...base, value: 'second' } });
    } finally {
      vi.useRealTimers();
    }

    expect((await loadFamily()).suggestions).toEqual([]);

    await signIn();
    const { suggestions } = await loadFamily();
    expect(suggestions.map((s) => s.value)).toEqual(['second', 'first']);

    for (const s of suggestions) {
      await resolveSuggestion({ data: { id: s.id, accept: false } });
    }

    expect((await loadFamily()).suggestions).toEqual([]);
  });

  it('ignores what a bot sends through the hidden field', async () => {
    await addSuggestion({
      data: {
        personId: 'p1',
        field: 'other',
        value: 'spam',
        author: 'bot',
        website: 'http://spam.example',
      },
    });

    await signIn();
    expect((await loadFamily()).suggestions).toEqual([]);
  });

  it('rejects a malformed resolution', async () => {
    await signIn();

    await rejectsWith(
      resolveSuggestion({ data: { id: 'x', accept: 'yes' as never } }),
      400,
    );

    await rejectsWith(resolveSuggestion({ data: null as never }), 400);
  });
});

describe('people', () => {
  it('lets only the admin change people or export the data', async () => {
    await rejectsWith(exportFamily(), 403);
    await rejectsWith(removePerson({ data: 'p1' }), 403);
  });

  it('adds, edits and removes a person', async () => {
    await signIn();

    const id = await addPerson({
      data: { name: 'Mới', gender: 'female', spouseIds: [] },
    });

    expect(id).toMatch(/^[0-9a-f-]{36}$/);

    const added = (await loadFamily()).people.find((p) => p.id === id)!;
    await updatePerson({ data: { ...added, birthDate: '2/10/1990' } });

    const doc = await exportFamily();
    expect(doc.schemaVersion).toBe(SCHEMA_VERSION);
    expect(doc.people.find((p) => p.id === id)?.birthDate).toBe('1990-10-02');

    await removePerson({ data: id });
    expect((await loadFamily()).people.some((p) => p.id === id)).toBe(false);
  });
});
