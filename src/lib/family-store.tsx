import { createContext, useContext, useMemo } from 'react';

import { indexById, seedPeople, yearOf } from './family-data';
import { REGIONS } from './kinship';
import { lunarToSolar, normalizeDate, toISODate } from './lunar';
import { jsonCodec, oneOf, useStoredState } from './use-stored-state';

import type { ReactNode } from 'react';
import type { Person } from './family-data';
import type { Region } from './kinship';
import type { Codec } from './use-stored-state';

export type Suggestion = {
  id: string;
  personId: string;
  field: 'name' | 'courtesyName' | 'birthDate' | 'deathDate' | 'other';
  value: string;
  author: string;
  createdAt: number;
};

type Ctx = {
  people: Person[];
  byId: Map<string, Person>;
  suggestions: Suggestion[];
  isAdmin: boolean;
  /** Regional variant of kinship terms used across the app. */
  region: Region;
  setRegion: (r: Region) => void;
  login: (code: string) => boolean;
  logout: () => void;
  addPerson: (p: Omit<Person, 'id'>) => void;
  removePerson: (id: string) => void;
  addSuggestion: (s: Omit<Suggestion, 'id' | 'createdAt'>) => void;
  resolveSuggestion: (id: string, accept: boolean) => void;
};

const FamilyCtx = createContext<Ctx | null>(null);
const DEMO_CODE = 'admin';

/** Older saved records kept years and the lunar memorial day as separate fields. */
type Stored = Person &
  Partial<{
    birthYear: number;
    deathYear: number;
    memorial: string;
  }>;

const seedById = indexById(seedPeople);

/** A full "YYYY-MM-DD" date, as opposed to a bare year. */
const isFullDate = (date: string | undefined) => !!date && date.length > 4;

/**
 * Full dates were added to the seed after people were first saved: give a
 * saved seed record the seed's full date when it only knows the year (or
 * nothing) and that year does not contradict the seed.
 */
function backfillDates(p: Person): Person {
  const seed = seedById.get(p.id);
  if (!seed) return p;

  const fill = (mine: string | undefined, theirs: string | undefined) =>
    !isFullDate(mine) &&
    isFullDate(theirs) &&
    (yearOf(mine) === undefined || yearOf(mine) === yearOf(theirs))
      ? theirs
      : mine;

  return {
    ...p,
    birthDate: fill(p.birthDate, seed.birthDate),
    deathDate: fill(p.deathDate, seed.deathDate),
  };
}

/** Solar date of a stored lunar memorial ("MM-DD") within a given solar year. */
function memorialToDate(memorial: string, year: number) {
  const [month = 1, day = 1] = memorial.split('-').map(Number);
  const inYear = [year - 1, year].map((y) => lunarToSolar(day, month, y));

  return toISODate(inYear.find((d) => d.getFullYear() === year) ?? inYear[1]);
}

function migratePerson({
  birthYear,
  deathYear,
  memorial,
  ...p
}: Stored): Person {
  const death = p.deathDate ?? (deathYear ? String(deathYear) : undefined);
  const year = yearOf(death);

  return backfillDates({
    ...p,
    birthDate: p.birthDate ?? (birthYear ? String(birthYear) : undefined),
    // A memorial plus a death year pins down the full date of death.
    deathDate:
      memorial && year && !isFullDate(death)
        ? memorialToDate(memorial, year)
        : death,
  });
}

/** A person with one field replaced by an accepted suggestion. */
function applySuggestion(
  p: Person,
  field: Exclude<Suggestion['field'], 'other'>,
  value: string,
): Person {
  if (field === 'birthDate' || field === 'deathDate') {
    const date = normalizeDate(value);

    return date ? { ...p, [field]: date } : p;
  }

  return { ...p, [field]: value };
}

/** Drop repeated ids (seen in older saved data); the first record wins. */
const uniqueById = (people: Person[]) => {
  const seen = new Set<string>();

  return people.filter((p) => !seen.has(p.id) && seen.add(p.id));
};

/** Suggestion fields that no longer exist: birth year → birth date, memorial → note. */
const migrateSuggestion = (s: Suggestion): Suggestion => {
  const field = s.field as string;

  return field === 'birthYear'
    ? { ...s, field: 'birthDate' }
    : field === 'memorial'
      ? { ...s, field: 'other' }
      : s;
};

const peopleCodec = jsonCodec((data) =>
  uniqueById((data as Stored[]).map(migratePerson)),
);

const suggestionsCodec = jsonCodec((data) =>
  (data as Suggestion[]).map(migrateSuggestion),
);

const adminCodec: Codec<boolean> = {
  parse: (raw) => raw === '1',
  serialize: (v) => (v ? '1' : '0'),
};

const regionCodec = oneOf(REGIONS);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const [people, setPeople] = useStoredState(
    'ft-people',
    seedPeople,
    peopleCodec,
  );

  const [suggestions, setSuggestions] = useStoredState<Suggestion[]>(
    'ft-sugg',
    [],
    suggestionsCodec,
  );

  const [isAdmin, setAdmin] = useStoredState('ft-admin', false, adminCodec);

  const [region, setRegion] = useStoredState<Region>(
    'ft-region',
    'north',
    regionCodec,
  );

  const byId = useMemo(() => indexById(people), [people]);

  const value = useMemo<Ctx>(
    () => ({
      people,
      byId,
      suggestions,
      isAdmin,
      region,
      setRegion,
      login: (code) => {
        const ok = code === DEMO_CODE;
        if (ok) setAdmin(true);

        return ok;
      },
      logout: () => setAdmin(false),
      addPerson: (p) => {
        const id = `p${Date.now().toString(36)}`;

        setPeople((prev) =>
          [...prev, { ...p, id }].map((x) =>
            p.spouseIds.includes(x.id)
              ? { ...x, spouseIds: [...x.spouseIds, id] }
              : x,
          ),
        );
      },
      removePerson: (id) =>
        setPeople((prev) =>
          prev
            .filter((p) => p.id !== id)
            .map((p) => ({
              ...p,
              fatherId: p.fatherId === id ? undefined : p.fatherId,
              motherId: p.motherId === id ? undefined : p.motherId,
              spouseIds: p.spouseIds.filter((s) => s !== id),
            })),
        ),
      addSuggestion: (s) =>
        setSuggestions((prev) => [
          { ...s, id: crypto.randomUUID(), createdAt: Date.now() },
          ...prev,
        ]),
      resolveSuggestion: (id, accept) => {
        const s = suggestions.find((x) => x.id === id);

        if (accept && s && s.field !== 'other') {
          const field = s.field;

          setPeople((prev) =>
            prev.map((p) =>
              p.id === s.personId ? applySuggestion(p, field, s.value) : p,
            ),
          );
        }

        setSuggestions((prev) => prev.filter((x) => x.id !== id));
      },
    }),
    [
      people,
      byId,
      suggestions,
      isAdmin,
      region,
      setPeople,
      setSuggestions,
      setAdmin,
      setRegion,
    ],
  );

  return <FamilyCtx.Provider value={value}>{children}</FamilyCtx.Provider>;
}

export const useFamily = () => {
  const c = useContext(FamilyCtx);
  if (!c) throw new Error('FamilyProvider missing');

  return c;
};
