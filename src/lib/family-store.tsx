import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { seedPeople } from './family-data';

import type { Person } from './family-data';
import type { ReactNode } from 'react';

export type Suggestion = {
  id: string;
  personId: string;
  field: 'name' | 'courtesyName' | 'birthYear' | 'memorial' | 'other';
  value: string;
  author: string;
  createdAt: number;
};

type Ctx = {
  people: Person[];
  byId: Map<string, Person>;
  suggestions: Suggestion[];
  isAdmin: boolean;
  login: (code: string) => boolean;
  logout: () => void;
  addPerson: (p: Omit<Person, 'id'>) => void;
  removePerson: (id: string) => void;
  addSuggestion: (s: Omit<Suggestion, 'id' | 'createdAt'>) => void;
  resolveSuggestion: (id: string, accept: boolean) => void;
};

const FamilyCtx = createContext<Ctx | null>(null);
const DEMO_CODE = 'admin';

/** Records saved before the courtesy name field was renamed from `tu`. */
type Stored = Person & { tu?: string };

const migratePerson = ({ tu, ...p }: Stored): Person =>
  tu !== undefined && p.courtesyName === undefined
    ? { ...p, courtesyName: tu }
    : p;

/** Drop repeated ids (seen in older saved data); the first record wins. */
const uniqueById = (people: Person[]) => {
  const seen = new Set<string>();

  return people.filter((p) => !seen.has(p.id) && seen.add(p.id));
};

const migrateSuggestion = (s: Suggestion): Suggestion =>
  (s.field as string) === 'tu' ? { ...s, field: 'courtesyName' } : s;

export function FamilyProvider({ children }: { children: ReactNode }) {
  const [people, setPeople] = useState<Person[]>(seedPeople);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isAdmin, setAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const p = localStorage.getItem('ft-people');
      const s = localStorage.getItem('ft-sugg');
      if (p)
        setPeople(uniqueById((JSON.parse(p) as Stored[]).map(migratePerson)));
      if (s)
        setSuggestions((JSON.parse(s) as Suggestion[]).map(migrateSuggestion));
      setAdmin(localStorage.getItem('ft-admin') === '1');
    } catch {}

    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem('ft-people', JSON.stringify(people));
    localStorage.setItem('ft-sugg', JSON.stringify(suggestions));
    localStorage.setItem('ft-admin', isAdmin ? '1' : '0');
  }, [people, suggestions, isAdmin, loaded]);

  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  const value = useMemo<Ctx>(
    () => ({
      people,
      byId,
      suggestions,
      isAdmin,
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
              p.id === s.personId
                ? {
                    ...p,
                    [field]:
                      field === 'birthYear'
                        ? Number(s.value) || undefined
                        : s.value,
                  }
                : p,
            ),
          );
        }

        setSuggestions((prev) => prev.filter((x) => x.id !== id));
      },
    }),
    [people, byId, suggestions, isAdmin],
  );

  return <FamilyCtx.Provider value={value}>{children}</FamilyCtx.Provider>;
}

export const useFamily = () => {
  const c = useContext(FamilyCtx);
  if (!c) throw new Error('FamilyProvider missing');

  return c;
};
