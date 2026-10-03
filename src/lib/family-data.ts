import type { CSSProperties } from 'react';

export type Gender = 'male' | 'female';
export type Person = {
  id: string;
  name: string;
  courtesyName?: string | undefined;
  /** Solar date of birth: "YYYY-MM-DD", or just "YYYY" when only the year is known. */
  birthDate?: string | undefined;
  /** Solar date of death, same forms as `birthDate`; set only for the deceased. */
  deathDate?: string | undefined;
  gender: Gender;
  fatherId?: string | undefined;
  motherId?: string | undefined;
  spouseIds: string[];
};

/** A visitor's proposed correction, waiting for the admin to accept or dismiss. */
export type Suggestion = {
  id: string;
  personId: string;
  field: 'name' | 'courtesyName' | 'birthDate' | 'deathDate' | 'other';
  value: string;
  author: string;
  /** Unix time in milliseconds. */
  createdAt: number;
};

/** Year of a stored date ("YYYY-MM-DD" or "YYYY"); undefined when unknown. */
export const yearOf = (date: string | undefined) =>
  date ? Number(date.slice(0, 4)) || undefined : undefined;

export const birthYear = (p: Person) => yearOf(p.birthDate);
export const deathYear = (p: Person) => yearOf(p.deathDate);
export const isDeceased = (p: Person) => !!p.deathDate;

/** Lookup map by id. */
export const indexById = (people: Person[]) =>
  new Map(people.map((p) => [p.id, p]));

export const childrenOf = (people: Person[], id: string) =>
  people.filter((p) => p.fatherId === id || p.motherId === id);

/** Parent id → their children, in data order; for helpers that ask often. */
export function childrenIndex(people: Person[]) {
  const kids = new Map<string, Person[]>();

  const add = (parent: string | undefined, child: Person) => {
    if (!parent) return;
    const list = kids.get(parent);

    if (list) list.push(child);
    else kids.set(parent, [child]);
  };

  people.forEach((p) => {
    add(p.fatherId, p);
    if (p.motherId !== p.fatherId) add(p.motherId, p);
  });

  return kids;
}

type Index = { byId: Map<string, Person>; kids: Map<string, Person[]> };

const indexOf = (people: Person[]): Index => ({
  byId: indexById(people),
  kids: childrenIndex(people),
});

/** Everyone descended from a person (not including them). */
export function descendantsOf(people: Person[], id: string) {
  const kids = childrenIndex(people);
  const out = new Set<string>();
  const queue = [id];

  for (const x of queue) {
    kids.get(x)?.forEach((c) => {
      if (out.has(c.id) || c.id === id) return;
      out.add(c.id);
      queue.push(c.id);
    });
  }

  return out;
}

export const siblingsOf = (people: Person[], p: Person) =>
  people.filter(
    (x) =>
      x.id !== p.id &&
      ((p.fatherId && x.fatherId === p.fatherId) ||
        (p.motherId && x.motherId === p.motherId)),
  );

/** CSS vars for gender styling: --c (border / selected) and --c-soft (hover). */
export const genderVars = (g: Gender) =>
  ({
    '--c': `var(--${g})`,
    '--c-soft': `var(--${g}-soft)`,
  }) as CSSProperties;

/** Courtesy name in parentheses, or "" */
export const courtesyNameText = (p: Person) =>
  p.courtesyName ? `(${p.courtesyName})` : '';

/** Family name: the first word of a Vietnamese full name. */
export const surname = (p: Person) => p.name.split(' ')[0];

/** Given name: the last word of a Vietnamese full name. */
export const givenName = (p: Person) =>
  p.name.slice(p.name.lastIndexOf(' ') + 1);

/** "1925–1995", "1950" or "?" */
export const lifespan = (p: Person) => {
  const died = deathYear(p);

  return `${birthYear(p) ?? '?'}${died ? `–${died}` : ''}`;
};

/** Accent-insensitive lowercase, so "Duc" matches "Đức". */
const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

export const matches = (p: Person, q: string) =>
  norm(
    `${p.name} ${p.courtesyName ?? ''} ${birthYear(p) ?? ''} ${deathYear(p) ?? ''}`,
  ).includes(norm(q));

/** Climb the father line (mother if no father is known) to the top ancestor. */
function topAncestor(byId: Map<string, Person>, id: string) {
  let top = byId.get(id);
  const seen = new Set<string>();

  while (top && !seen.has(top.id)) {
    seen.add(top.id);

    const parent =
      (top.fatherId && byId.get(top.fatherId)) ||
      (top.motherId && byId.get(top.motherId));

    if (!parent) break;
    top = parent;
  }

  return top;
}

/**
 * A person's house (họ): the top ancestor of their father line, every
 * descendant through sons, plus spouses. Daughters are shown, but their
 * children belong to their husband's house. `maxGen` caps the generations
 * shown (1 = the ancestor only).
 */
export const houseOf = (people: Person[], id: string, maxGen = Infinity) =>
  houseIn(indexOf(people), id, maxGen);

function houseIn({ byId, kids }: Index, id: string, maxGen: number) {
  const out = new Set<string>();
  const top = topAncestor(byId, id);
  if (!top) return out;
  const visited = new Set<string>();

  const down = (p: Person, gen: number) => {
    if (visited.has(p.id)) return;
    visited.add(p.id);
    out.add(p.id);
    p.spouseIds.forEach((s) => byId.has(s) && out.add(s));
    if (gen >= maxGen || (p.gender === 'female' && p !== top)) return;
    kids.get(p.id)?.forEach((c) => down(c, gen + 1));
  };

  down(top, 1);

  return out;
}

/** Ancestor of the largest house: the tree shown by default. */
export const mainRootId = (people: Person[]) =>
  mainRootIn(people, indexOf(people));

function mainRootIn(people: Person[], index: Index) {
  const { byId } = index;
  let best: { id: string; size: number; year: number } | undefined;

  people.forEach((p) => {
    if (
      (p.fatherId && byId.has(p.fatherId)) ||
      (p.motherId && byId.has(p.motherId))
    )
      return;
    const size = houseIn(index, p.id, Infinity).size;
    const year = birthYear(p) ?? Infinity;
    if (!best || size > best.size || (size === best.size && year < best.year))
      best = { id: p.id, size, year };
  });

  return best?.id;
}

/**
 * Generation of everyone connected to the main root, counted from the root:
 * 1 = the root and their spouse, 2 = their children (and spouses), and so on.
 * In-law ancestors older than the root come out as 0 or less.
 */
export function generationLevels(people: Person[]): Map<string, number> {
  const index = indexOf(people);
  const { byId, kids } = index;
  const levels = new Map<string, number>();
  const root = mainRootIn(people, index);
  if (!root) return levels;

  const queue = [root];
  levels.set(root, 1);

  const visit = (id: string | undefined, level: number) => {
    if (!id || !byId.has(id) || levels.has(id)) return;
    levels.set(id, level);
    queue.push(id);
  };

  // Iterating an array while pushing to it visits the new entries too.
  for (const id of queue) {
    const p = byId.get(id)!;
    const level = levels.get(id)!;

    p.spouseIds.forEach((s) => visit(s, level));
    visit(p.fatherId, level - 1);
    visit(p.motherId, level - 1);
    kids.get(id)?.forEach((c) => visit(c.id, level + 1));
  }

  return levels;
}

/** Add a person plus spouses, parents and siblings so they attach to the tree. */
export function reveal(people: Person[], shown: Set<string>, id: string) {
  const byId = indexById(people);
  const p = byId.get(id);
  if (!p) return shown;
  const next = new Set(shown);

  const add = (x: Person) => {
    next.add(x.id);
    x.spouseIds.forEach((s) => byId.has(s) && next.add(s));
  };

  add(p);

  [p.fatherId, p.motherId].forEach((pid) => {
    const parent = pid ? byId.get(pid) : undefined;
    if (parent) add(parent);
  });

  siblingsOf(people, p).forEach(add);

  return next;
}

/** Closest relatives, for framing: the person, spouses, parents, siblings, children. */
export function familyAround(people: Person[], id: string): string[] {
  const byId = indexById(people);
  const p = byId.get(id);
  if (!p) return [];

  const ids = [
    p.id,
    ...p.spouseIds,
    p.fatherId,
    p.motherId,
    ...siblingsOf(people, p).map((s) => s.id),
    ...childrenOf(people, p.id).map((c) => c.id),
  ];

  return [...new Set(ids.filter((x): x is string => !!x && byId.has(x)))];
}

/** How many children of each shown person are not shown. */
export function hiddenChildren(people: Person[], shown: Set<string>) {
  const kids = childrenIndex(people);
  const out = new Map<string, number>();

  shown.forEach((id) => {
    const n = kids.get(id)?.filter((c) => !shown.has(c.id)).length;
    if (n) out.set(id, n);
  });

  return out;
}

/** Add every child of a person (with their spouses). */
export function revealChildren(
  people: Person[],
  shown: Set<string>,
  id: string,
) {
  const byId = indexById(people);
  const next = new Set(shown);

  childrenOf(people, id).forEach((c) => {
    next.add(c.id);
    c.spouseIds.forEach((s) => byId.has(s) && next.add(s));
  });

  return next;
}
