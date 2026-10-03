import { descendantsOf, indexById } from '@/lib/family-data';
import { normalizeDate } from '@/lib/lunar';

import { reject } from './http-error';

import type { FamilyDoc } from './store';
import type { Gender, Person, Suggestion } from '@/lib/family-data';

/*
 * Input validation and the changes each write makes to the stored document.
 * Pure functions, so they run the same in server functions and unit tests.
 * Inputs arrive from the network as untrusted JSON.
 */

export type NewPerson = Omit<Person, 'id'>;
export type NewSuggestion = Omit<Suggestion, 'id' | 'createdAt'>;

/** Pending suggestions kept at most, so visitors cannot grow the store forever. */
export const MAX_PENDING = 200;

/* ---- Input validation ---- */

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

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

/** A non-empty trimmed string of at most `max` chars. */
export function requiredText(v: unknown, max: number, what: string) {
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

export const parseId = (input: unknown) => requiredText(input, 100, 'Id');

export function parsePerson(input: unknown): NewPerson {
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

/** A person's new details, with the id of whom they replace. */
export function parsePersonUpdate(input: unknown): NewPerson & { id: string } {
  if (!isRecord(input)) reject(400, 'Invalid person');

  return { ...parsePerson(input), id: parseId(input.id) };
}

/**
 * A visitor's suggestion, or null when the hidden `website` field is filled:
 * people never see it, so only bots do that.
 */
export function parseSuggestion(input: unknown): NewSuggestion | null {
  if (!isRecord(input)) reject(400, 'Invalid suggestion');
  if (input.website) return null;

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

/* ---- Changes to the document ---- */

/**
 * Checks a person's links against the people already saved: parents and
 * spouses must exist, parents must have the right gender, and nobody can be
 * their own spouse, parent or ancestor. `id` is undefined for a newcomer.
 */
function checkLinks(people: Person[], data: NewPerson, id?: string) {
  const byId = indexById(people);

  for (const other of [data.fatherId, data.motherId, ...data.spouseIds]) {
    if (other === undefined) continue;
    if (other === id) reject(400, 'A person cannot be linked to themselves');
    if (!byId.has(other)) reject(400, 'Unknown person');
  }

  if (data.fatherId && byId.get(data.fatherId)?.gender !== 'male') {
    reject(400, 'The father must be male');
  }

  if (data.motherId && byId.get(data.motherId)?.gender !== 'female') {
    reject(400, 'The mother must be female');
  }

  if (id === undefined) return;
  const below = descendantsOf(people, id);

  if (
    (data.fatherId && below.has(data.fatherId)) ||
    (data.motherId && below.has(data.motherId))
  ) {
    reject(400, 'A descendant cannot be a parent');
  }
}

/** `spouses` of `id` list `id` back, and former spouses no longer do. */
function linkSpouses(people: Person[], id: string, spouses: string[]) {
  return people.map((p) => {
    if (p.id === id) return p;
    const listed = p.spouseIds.includes(id);
    const married = spouses.includes(p.id);
    if (listed === married) return p;

    return {
      ...p,
      spouseIds: married
        ? [...p.spouseIds, id]
        : p.spouseIds.filter((s) => s !== id),
    };
  });
}

export function addPersonTo(doc: FamilyDoc, id: string, data: NewPerson) {
  checkLinks(doc.people, data);

  doc.people = linkSpouses(
    [...doc.people, { ...data, id }],
    id,
    data.spouseIds,
  );
}

export function updatePersonIn(
  doc: FamilyDoc,
  { id, ...data }: NewPerson & { id: string },
) {
  if (!doc.people.some((p) => p.id === id)) reject(404, 'Unknown person');
  checkLinks(doc.people, data, id);

  doc.people = linkSpouses(
    doc.people.map((p) => (p.id === id ? { ...data, id } : p)),
    id,
    data.spouseIds,
  );
}

/** Children lose the parent link and spouses the marriage; nobody else changes. */
export function removePersonFrom(doc: FamilyDoc, id: string) {
  doc.people = doc.people
    .filter((p) => p.id !== id)
    .map((p) => ({
      ...p,
      fatherId: p.fatherId === id ? undefined : p.fatherId,
      motherId: p.motherId === id ? undefined : p.motherId,
      spouseIds: p.spouseIds.filter((s) => s !== id),
    }));
}

export function addSuggestionTo(doc: FamilyDoc, suggestion: Suggestion) {
  if (!doc.people.some((p) => p.id === suggestion.personId)) {
    reject(400, 'Unknown person');
  }

  if (Object.keys(doc.suggestions).length >= MAX_PENDING) {
    reject(429, 'Too many pending suggestions');
  }

  doc.suggestions[suggestion.id] = suggestion;
}

/** Remove a suggestion; when accepted, apply it to the person first. */
export function resolveSuggestionIn(
  doc: FamilyDoc,
  id: string,
  accept: boolean,
) {
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
}
