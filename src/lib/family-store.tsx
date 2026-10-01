import { createContext, useContext, useMemo } from 'react';

import { useRouter } from '@tanstack/react-router';

import {
  addPerson as addPersonFn,
  addSuggestion as addSuggestionFn,
  login as loginFn,
  logout as logoutFn,
  removePerson as removePersonFn,
  resolveSuggestion as resolveSuggestionFn,
} from '@/server/family';

import { indexById } from './family-data';
import { REGIONS } from './kinship';
import { oneOf, useStoredState } from './use-stored-state';

import type { Person, Suggestion } from './family-data';
import type { Region } from './kinship';
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
  /** Resolves to whether the passcode was accepted. */
  login: (code: string) => Promise<boolean>;
  logout: () => Promise<void>;
  addPerson: (p: Omit<Person, 'id'>) => Promise<void>;
  removePerson: (id: string) => Promise<void>;
  addSuggestion: (s: Omit<Suggestion, 'id' | 'createdAt'>) => Promise<void>;
  resolveSuggestion: (id: string, accept: boolean) => Promise<void>;
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

  const byId = useMemo(() => indexById(people), [people]);

  const value = useMemo<Ctx>(() => {
    const refresh = () => router.invalidate();

    return {
      people,
      byId,
      suggestions,
      isAdmin,
      region,
      setRegion,
      login: async (code) => {
        const ok = await loginFn({ data: code });
        if (ok) await refresh();

        return ok;
      },
      logout: async () => {
        await logoutFn();
        await refresh();
      },
      addPerson: async (p) => {
        await addPersonFn({ data: p });
        await refresh();
      },
      removePerson: async (id) => {
        await removePersonFn({ data: id });
        await refresh();
      },
      addSuggestion: async (s) => {
        await addSuggestionFn({ data: s });
        if (isAdmin) await refresh();
      },
      resolveSuggestion: async (id, accept) => {
        await resolveSuggestionFn({ data: { id, accept } });
        await refresh();
      },
    };
  }, [people, byId, suggestions, isAdmin, region, setRegion, router]);

  return <FamilyCtx.Provider value={value}>{children}</FamilyCtx.Provider>;
}

export const useFamily = () => {
  const c = useContext(FamilyCtx);
  if (!c) throw new Error('FamilyProvider missing');

  return c;
};
