import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';

import { createServerFn } from '@tanstack/react-start';
import { getRequestIP } from '@tanstack/react-start/server';

import {
  addPersonTo,
  addSuggestionTo,
  isRecord,
  parseId,
  parsePerson,
  parsePersonUpdate,
  parseSuggestion,
  removePersonFrom,
  requiredText,
  resolveSuggestionIn,
  updatePersonIn,
} from './family-doc';
import { reject } from './http-error';
import { adminOnly } from './middleware';
import {
  checkPasscode,
  endAdminSession,
  isAdminRequest,
  startAdminSession,
} from './session';
import { store } from './store';
import { loginThrottle } from './throttle';

import type { NewPerson, NewSuggestion } from './family-doc';

export type { NewPerson, NewSuggestion } from './family-doc';

/** Outcome of a login attempt. */
export type LoginResult = 'ok' | 'wrong' | 'locked';

/** Pause after a wrong passcode, so guesses cannot be fired quickly. */
const WRONG_PASSCODE_DELAY_MS = 1000;

/* ---- Reads ---- */

/** Everything the page needs in one round trip; suggestions only for the admin. */
export const loadFamily = createServerFn({ method: 'GET' }).handler(
  async () => {
    const isAdmin = isAdminRequest();
    const { people, suggestions } = await store().read();

    return {
      isAdmin,
      people,
      suggestions: isAdmin
        ? Object.values(suggestions).sort((a, b) => b.createdAt - a.createdAt)
        : [],
    };
  },
);

/** The whole stored document, for the admin to keep a copy. */
export const exportFamily = createServerFn({ method: 'GET' })
  .middleware([adminOnly])
  .handler(async () => store().read());

/* ---- Admin session ---- */

export const login = createServerFn({ method: 'POST' })
  .validator((code: string) => requiredText(code, 200, 'Passcode'))
  .handler(async ({ data }): Promise<LoginResult> => {
    // Vercel sets X-Forwarded-For itself, so it can be trusted there.
    const client = getRequestIP({ xForwardedFor: true }) ?? 'unknown';
    if (loginThrottle.locked(client)) return 'locked';

    if (!checkPasscode(data)) {
      loginThrottle.fail(client);
      await sleep(WRONG_PASSCODE_DELAY_MS);

      return loginThrottle.locked(client) ? 'locked' : 'wrong';
    }

    loginThrottle.clear(client);
    startAdminSession();

    return 'ok';
  });

export const logout = createServerFn({ method: 'POST' }).handler(() => {
  endAdminSession();

  return true;
});

/* ---- Public writes ---- */

export const addSuggestion = createServerFn({ method: 'POST' })
  .validator((s: NewSuggestion & { website?: string }) => parseSuggestion(s))
  .handler(async ({ data }) => {
    // A bot filled the hidden field: pretend it worked.
    if (!data) return true;

    const suggestion = { ...data, id: randomUUID(), createdAt: Date.now() };
    await store().update((doc) => addSuggestionTo(doc, suggestion));

    return true;
  });

/* ---- Admin writes ---- */

export const resolveSuggestion = createServerFn({ method: 'POST' })
  .middleware([adminOnly])
  .validator((input: { id: string; accept: boolean }) => {
    if (!isRecord(input) || typeof input.accept !== 'boolean') {
      reject(400, 'Invalid input');
    }

    return { id: parseId(input.id), accept: input.accept };
  })
  .handler(async ({ data: { id, accept } }) => {
    await store().update((doc) => resolveSuggestionIn(doc, id, accept));

    return true;
  });

export const addPerson = createServerFn({ method: 'POST' })
  .middleware([adminOnly])
  .validator((p: NewPerson) => parsePerson(p))
  .handler(async ({ data }) => {
    const id = randomUUID();
    await store().update((doc) => addPersonTo(doc, id, data));

    return id;
  });

export const updatePerson = createServerFn({ method: 'POST' })
  .middleware([adminOnly])
  .validator((p: NewPerson & { id: string }) => parsePersonUpdate(p))
  .handler(async ({ data }) => {
    await store().update((doc) => updatePersonIn(doc, data));

    return true;
  });

export const removePerson = createServerFn({ method: 'POST' })
  .middleware([adminOnly])
  .validator(parseId)
  .handler(async ({ data: id }) => {
    await store().update((doc) => removePersonFrom(doc, id));

    return true;
  });
