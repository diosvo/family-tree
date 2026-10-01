import { randomUUID } from 'node:crypto';

import { createServerFn } from '@tanstack/react-start';

import { normalizeDate } from '@/lib/lunar';

import { reject } from './http-error';
import { adminOnly } from './middleware';
import {
  checkPasscode,
  endAdminSession,
  isAdminRequest,
  startAdminSession,
} from './session';
import { store } from './store';

import type { Gender, Person, Suggestion } from '@/lib/family-data';

export type NewPerson = Omit<Person, 'id'>;
export type NewSuggestion = Omit<Suggestion, 'id' | 'createdAt'>;

/* ---- Input validation (inputs arrive from the network as untrusted JSON) ---- */

const GENDERS: Gender[] = ['male', 'female'];

const FIELDS: Array<Suggestion['field']> = [
  'name',
  'courtesyName',
  'birthDate',
  'deathDate',
  'other',
];

/** Stored date form: "YYYY-MM-DD" or "YYYY". */
const DATE = /^\d{4}(-\d{2}-\d{2})?$/;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

/** A non-empty trimmed string of at most `max` chars. */
function requiredText(v: unknown, max: number, what: string) {
  if (typeof v !== 'string' || !v.trim()) reject(400, `${what} is required`);
  if (v.length > max) reject(400, `${what} is too long`);

  return v.trim();
}

/** Like `requiredText`, but "" and undefined become undefined. */
function optionalText(v: unknown, max: number, what: string) {
  if (v === undefined || v === null || v === '') return undefined;

  return requiredText(v, max, what);
}

/** A date already in stored form, or something `normalizeDate` can fix. */
function optionalDate(v: unknown, what: string) {
  const s = optionalText(v, 20, what);
  if (s === undefined) return undefined;
  const date = DATE.test(s) ? s : normalizeDate(s);
  if (!date) reject(400, `${what} must be YYYY-MM-DD or YYYY`);

  return date;
}

function parsePerson(input: unknown): NewPerson {
  if (!isRecord(input)) reject(400, 'Invalid person');
  if (!GENDERS.includes(input.gender as Gender)) reject(400, 'Invalid gender');

  const spouseIds = input.spouseIds ?? [];

  if (
    !Array.isArray(spouseIds) ||
    !spouseIds.every((s) => typeof s === 'string' && s)
  ) {
    reject(400, 'Invalid spouses');
  }

  return {
    name: requiredText(input.name, 200, 'Name'),
    courtesyName: optionalText(input.courtesyName, 200, 'Courtesy name'),
    gender: input.gender as Gender,
    birthDate: optionalDate(input.birthDate, 'Date of birth'),
    deathDate: optionalDate(input.deathDate, 'Date of death'),
    fatherId: optionalText(input.fatherId, 100, 'Father'),
    motherId: optionalText(input.motherId, 100, 'Mother'),
    spouseIds: [...new Set(spouseIds as string[])],
  };
}

function parseSuggestion(input: unknown): NewSuggestion {
  if (!isRecord(input)) reject(400, 'Invalid suggestion');

  if (!FIELDS.includes(input.field as Suggestion['field'])) {
    reject(400, 'Invalid field');
  }

  return {
    personId: requiredText(input.personId, 100, 'Person'),
    field: input.field as Suggestion['field'],
    value: requiredText(input.value, 1000, 'Value'),
    author: requiredText(input.author, 100, 'Author'),
  };
}

const parseId = (input: unknown) => requiredText(input, 100, 'Id');

/** Rejects ids that are not in `people` (the father, mother and spouses). */
function requireKnown(people: Person[], ids: Array<string | undefined>) {
  const known = new Set(people.map((p) => p.id));

  for (const id of ids) {
    if (id !== undefined && !known.has(id)) reject(400, 'Unknown person');
  }
}

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

/* ---- Admin session ---- */

export const login = createServerFn({ method: 'POST' })
  .validator((code: string) => requiredText(code, 200, 'Passcode'))
  .handler(({ data }) => {
    if (!checkPasscode(data)) return false;
    startAdminSession();

    return true;
  });

export const logout = createServerFn({ method: 'POST' }).handler(() => {
  endAdminSession();

  return true;
});

/* ---- Public writes ---- */

export const addSuggestion = createServerFn({ method: 'POST' })
  .validator((s: NewSuggestion) => parseSuggestion(s))
  .handler(async ({ data }) => {
    const id = randomUUID();
    const createdAt = Date.now();

    await store().update((doc) => {
      requireKnown(doc.people, [data.personId]);
      doc.suggestions[id] = { ...data, id, createdAt };
    });

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
    await store().update((doc) => {
      const s = doc.suggestions[id] as Suggestion | undefined;
      if (!s) return;

      delete doc.suggestions[id];
      if (!accept || s.field === 'other') return;

      const field = s.field;

      // Dates are stored normalised; an unparsable date leaves the person as is.
      const value =
        field === 'birthDate' || field === 'deathDate'
          ? normalizeDate(s.value)
          : s.value;

      if (value === undefined) return;

      doc.people = doc.people.map((p) =>
        p.id === s.personId ? { ...p, [field]: value } : p,
      );
    });

    return true;
  });

export const addPerson = createServerFn({ method: 'POST' })
  .middleware([adminOnly])
  .validator((p: NewPerson) => parsePerson(p))
  .handler(async ({ data }) => {
    const id = `p${Date.now().toString(36)}`;

    await store().update((doc) => {
      requireKnown(doc.people, [
        data.fatherId,
        data.motherId,
        ...data.spouseIds,
      ]);

      // Marriage is symmetric: list the newcomer on each spouse too.
      const updated = doc.people.map((p) =>
        data.spouseIds.includes(p.id)
          ? { ...p, spouseIds: [...p.spouseIds, id] }
          : p,
      );

      doc.people = [...updated, { ...data, id }];
    });

    return id;
  });

export const removePerson = createServerFn({ method: 'POST' })
  .middleware([adminOnly])
  .validator(parseId)
  .handler(async ({ data: id }) => {
    // Children lose the parent link and spouses the marriage; nobody else changes.
    const unlink = (p: Person): Person => ({
      ...p,
      fatherId: p.fatherId === id ? undefined : p.fatherId,
      motherId: p.motherId === id ? undefined : p.motherId,
      spouseIds: p.spouseIds.filter((s) => s !== id),
    });

    await store().update((doc) => {
      doc.people = doc.people.filter((p) => p.id !== id).map(unlink);
    });

    return true;
  });
