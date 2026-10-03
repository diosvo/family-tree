import { createContext, useContext, useMemo, useState } from 'react';

import { useRouter } from '@tanstack/react-router';

import {
  addPerson as addPersonFn,
  addSuggestion as addSuggestionFn,
  exportFamily as exportFamilyFn,
  login as loginFn,
  logout as logoutFn,
  removePerson as removePersonFn,
  resolveSuggestion as resolveSuggestionFn,
  updatePerson as updatePersonFn,
} from '@/server/family';

import { indexById } from './family-data';
import { REGIONS } from './kinship';
import { oneOf, useStoredState } from './use-stored-state';

import type { Person, Suggestion } from './family-data';
import type { Region } from './kinship';
import type { LoginResult } from '@/server/family';
import type { FamilyDoc } from '@/server/store';
import type { ReactNode } from 'react';

export type { Suggestion } from './family-data';

/** What the route loader fetched from the server. */
export type FamilyData = {
  people: Person[];
  /** Pending suggestions; empty unless `isAdmin`. */
  suggestions: Suggestion[];
  isAdmin: boolean;
};

type Ctx = {
  people: Person[];
  byId: Map<string, Person>;
  suggestions: Suggestion[];
  isAdmin: boolean;
  /** Regional variant of kinship terms used across the app. */
  region: Region;
  setRegion: (r: Region) => void;
  /** A failed write to show the user, until dismissed. */
  error: string | undefined;
  /** Show a failed write in the notice; for callers with no message of their own. */
  reportError: (error: unknown) => void;
  dismissError: () => void;
  login: (code: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  /* Writes reload the data afterwards, even when they fail, and rethrow. */
  addPerson: (p: Omit<Person, 'id'>) => Promise<void>;
  updatePerson: (p: Person) => Promise<void>;
  removePerson: (id: string) => Promise<void>;
  resolveSuggestion: (id: string, accept: boolean) => Promise<void>;
  addSuggestion: (
    s: Omit<Suggestion, 'id' | 'createdAt'> & { website?: string },
  ) => Promise<void>;
  exportFamily: () => Promise<FamilyDoc>;
};

const FamilyCtx = createContext<Ctx | null>(null);
const regionCodec = oneOf(REGIONS);

/**
 * People, suggestions and the admin flag live on the server (see
 * src/server/family.ts); every write re-runs the route loader so all consumers
 * see the same state. Only the kinship region is a per-browser preference.
 */
export function FamilyProvider({
  data,
  children,
}: {
  data: FamilyData;
  children: ReactNode;
}) {
  const router = useRouter();
  const { people, suggestions, isAdmin } = data;

  const [region, setRegion] = useStoredState<Region>(
    'ft-region',
    'south',
    regionCodec,
  );

  const [error, setError] = useState<string>();
  const byId = useMemo(() => indexById(people), [people]);

  const value = useMemo<Ctx>(() => {
    const refresh = () => router.invalidate();

    /** Run an admin write, then reload. */
    const write = async (send: () => Promise<unknown>) => {
      setError(undefined);

      try {
        await send();
      } finally {
        // Also after a failure: someone else may have changed the data.
        await refresh();
      }
    };

    return {
      people,
      byId,
      suggestions,
      isAdmin,
      region,
      setRegion,
      error,
      reportError: (e) => setError(e instanceof Error ? e.message : String(e)),
      dismissError: () => setError(undefined),
      login: async (code) => {
        const result = await loginFn({ data: code });
        if (result === 'ok') await refresh();

        return result;
      },
      logout: async () => {
        await logoutFn();
        await refresh();
      },
      addPerson: (p) => write(() => addPersonFn({ data: p })),
      updatePerson: (p) => write(() => updatePersonFn({ data: p })),
      removePerson: (id) => write(() => removePersonFn({ data: id })),
      resolveSuggestion: (id, accept) =>
        write(() => resolveSuggestionFn({ data: { id, accept } })),
      addSuggestion: async (s) => {
        await addSuggestionFn({ data: s });
        if (isAdmin) await refresh();
      },
      exportFamily: () => exportFamilyFn(),
    };
  }, [people, byId, suggestions, isAdmin, region, setRegion, router, error]);

  return <FamilyCtx.Provider value={value}>{children}</FamilyCtx.Provider>;
}

export const useFamily = () => {
  const c = useContext(FamilyCtx);
  if (!c) throw new Error('FamilyProvider missing');

  return c;
};
