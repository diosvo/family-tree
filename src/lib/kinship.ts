import type { Person } from './family-data';

/** Relationship of B to A, with Vietnamese terms of address. */
export type Kin = {
  vi: string;
  en: string;
  aCalls: string;
  bCalls: string;
  path: Person[];
};

type Ctx = {
  byId: Map<string, Person>;
  /** True when x is older than y (birth year, else data order). */
  older: (x: Person, y: Person) => boolean;
};

const male = (p: Person) => p.gender === 'male';
const parentTerm = (p: Person) => (male(p) ? 'bố / ba' : 'mẹ / má');

const grandTerm = (p: Person, side: 'nội' | 'ngoại') =>
  `${male(p) ? 'ông' : 'bà'} ${side}`;

const greatTerm = (gen: number) =>
  gen === 3 ? 'cụ (ông/bà cố)' : gen === 4 ? 'kị (ông/bà sơ)' : 'tổ tiên';

const descTerm = (gen: number) =>
  ['', 'con', 'cháu', 'chắt', 'chút', 'chít'][gen] ?? 'cháu';

/** Sibling term for `p` relative to someone, given whether p is the elder. */
const sibTerm = (p: Person, elder: boolean) =>
  elder ? (male(p) ? 'anh' : 'chị') : 'em';

const sibLabel = (p: Person, elder: boolean): [string, string] =>
  elder
    ? male(p)
      ? ['anh trai', 'older brother']
      : ['chị gái', 'older sister']
    : male(p)
      ? ['em trai', 'younger brother']
      : ['em gái', 'younger sister'];

/**
 * Term for an uncle/aunt-level relative `u` of someone whose linking parent is
 * `viaParent` (the child of the shared ancestor on the junior side).
 * `senior` says whether u's branch is older than that parent's.
 */
function uncleTerm(
  u: Person,
  viaParent: Person,
  senior: boolean,
): [string, string] {
  const paternal = male(viaParent);
  if (paternal)
    return male(u)
      ? senior
        ? ['bác', "father's older brother"]
        : ['chú', "father's younger brother"]
      : ['cô', "father's sister"];

  return male(u) ? ['cậu', "mother's brother"] : ['dì', "mother's sister"];
}

/**
 * Terms for an elder relative `b` who is `gensAbove` generations above someone
 * and is (like) a sibling of that person's ancestor `sib`.
 * Returns [label vi, label en, how the junior calls b, how b calls the junior].
 */
function elderTerms(
  b: Person,
  sib: Person,
  senior: boolean,
  gensAbove: number,
): [string, string, string, string] {
  const [term, en] = uncleTerm(b, sib, senior);
  if (gensAbove === 1) return [term, en, term, 'cháu'];

  if (gensAbove === 2) {
    const prefix = male(b) ? 'ông' : 'bà';

    return [
      `${prefix} ${term}`,
      `great-${male(b) ? 'uncle' : 'aunt'}`,
      prefix,
      'cháu',
    ];
  }

  return ['cụ', `great-great-${male(b) ? 'uncle' : 'aunt'}`, 'cụ', 'chắt'];
}

/** All ancestors of p: id → chain of people from p's parent up to that ancestor. */
function ancestors(byId: Map<string, Person>, p: Person) {
  const out = new Map<string, Person[]>([[p.id, []]]);
  const queue: Array<[Person, Person[]]> = [[p, []]];

  while (queue.length) {
    const [x, chain] = queue.shift()!;

    for (const pid of [x.fatherId, x.motherId]) {
      const parent = pid ? byId.get(pid) : undefined;
      if (!parent || out.has(parent.id)) continue;
      const next = [...chain, parent];
      out.set(parent.id, next);
      queue.push([parent, next]);
    }
  }

  return out;
}

const kin = (
  [vi, en]: [string, string],
  aCalls: string,
  bCalls: string,
  path: Person[],
): Kin => ({ vi, en, aCalls, bCalls, path });

/** Blood relationship through the nearest shared ancestor, or null. */
function bloodKin(ctx: Ctx, a: Person, b: Person): Kin | null {
  const ancA = ancestors(ctx.byId, a);
  const ancB = ancestors(ctx.byId, b);
  let best: { chainA: Person[]; chainB: Person[] } | undefined;

  ancA.forEach((chainA, id) => {
    const chainB = ancB.get(id);
    if (!chainB) return;
    if (
      !best ||
      chainA.length + chainB.length < best.chainA.length + best.chainB.length
    )
      best = { chainA, chainB };
  });

  if (!best) return null;
  const { chainA, chainB } = best;
  const ga = chainA.length;
  const gb = chainB.length;

  const path = [a, ...chainA, ...chainB.slice(0, -1).reverse(), b].filter(
    (p, i, arr) => p !== arr[i - 1],
  );

  const { older } = ctx;

  // B descends from A.
  if (ga === 0) {
    if (gb === 1)
      return kin(
        male(b) ? ['con trai', 'son'] : ['con gái', 'daughter'],
        'con',
        parentTerm(a),
        path,
      );
    const side = male(chainB[gb - 2]) ? 'nội' : 'ngoại';
    if (gb === 2)
      return kin(
        [
          `cháu ${side}`,
          `${male(b) ? 'grandson' : 'granddaughter'} (${side === 'nội' ? "son's" : "daughter's"} child)`,
        ],
        'cháu',
        grandTerm(a, side),
        path,
      );

    return kin(
      [descTerm(gb), gb === 3 ? 'great-grandchild' : 'great-great-grandchild'],
      descTerm(gb),
      greatTerm(gb),
      path,
    );
  }

  // B is an ancestor of A.
  if (gb === 0) {
    if (ga === 1)
      return kin(
        male(b) ? ['bố / ba', 'father'] : ['mẹ / má', 'mother'],
        parentTerm(b),
        'con',
        path,
      );
    const side = male(chainA[0]) ? 'nội' : 'ngoại';
    if (ga === 2)
      return kin(
        [
          grandTerm(b, side),
          `${side === 'nội' ? 'paternal' : 'maternal'} ${male(b) ? 'grandfather' : 'grandmother'}`,
        ],
        grandTerm(b, side),
        'cháu',
        path,
      );

    return kin(
      [
        greatTerm(ga),
        ga === 3 ? 'great-grandparent' : 'great-great-grandparent',
      ],
      greatTerm(ga),
      descTerm(ga),
      path,
    );
  }

  // Siblings.
  if (ga === 1 && gb === 1) {
    const elder = older(b, a);
    const [vi, en] = sibLabel(b, elder);

    const half =
      a.fatherId !== b.fatherId
        ? [' (cùng mẹ khác cha)', ' (half, same mother)']
        : a.motherId !== b.motherId
          ? [' (cùng cha khác mẹ)', ' (half, same father)']
          : ['', ''];

    return kin(
      [vi + half[0], en + half[1]],
      sibTerm(b, elder),
      sibTerm(a, !elder),
      path,
    );
  }

  // B is a sibling of A's ancestor: uncle / aunt level.
  if (gb === 1) {
    const sib = chainA[ga - 2]; // A's ancestor who is B's sibling
    const [vi, en, aCalls, bCalls] = elderTerms(b, sib, older(b, sib), ga - 1);

    return kin([vi, en], aCalls, bCalls, path);
  }

  // B descends from A's sibling: nephew / niece level.
  if (ga === 1) {
    const sib = chainB[gb - 2]; // B's ancestor who is A's sibling
    const [, , bCalls, aCalls] = elderTerms(a, sib, older(a, sib), gb - 1);

    return kin(
      gb === 2
        ? male(b)
          ? ['cháu trai', 'nephew']
          : ['cháu gái', 'niece']
        : ['cháu (họ)', male(b) ? 'grand-nephew' : 'grand-niece'],
      aCalls,
      bCalls,
      path,
    );
  }

  // Cousins and their descendants. Seniority follows the branches, not ages.
  const branchA = chainA[ga - 2];
  const branchB = chainB[gb - 2];
  const seniorB = older(branchB, branchA);

  if (ga === gb) {
    const far = ga > 2;
    const term = sibTerm(b, seniorB);

    return kin(
      [
        `${term} họ${far ? ' xa' : ''}`,
        `${seniorB ? 'older' : 'younger'} cousin${far ? ' (distant)' : ''}`,
      ],
      term,
      sibTerm(a, !seniorB),
      path,
    );
  }

  if (gb < ga) {
    // B belongs to an older generation: (like) a sibling of A's ancestor.
    const d = ga - gb;
    const [vi, en, aCalls, bCalls] = elderTerms(b, chainA[d - 1], seniorB, d);

    return kin([`${vi} (họ)`, `${en} (distant)`], aCalls, bCalls, path);
  }

  // B belongs to a younger generation.
  const d = gb - ga;
  const [, , bCalls, aCalls] = elderTerms(a, chainB[d - 1], !seniorB, d);

  return kin(['cháu (họ)', 'distant nephew / niece'], aCalls, bCalls, path);
}

const spouseKin = (a: Person, b: Person): Kin =>
  kin(
    male(b) ? ['chồng', 'husband'] : ['vợ', 'wife'],
    male(b) ? 'anh / mình' : 'em / mình',
    male(a) ? 'anh / mình' : 'em / mình',
    [a, b],
  );

/** B is the spouse of X, where X is A's blood relative described by k. */
function inLawBySpouse(k: Kin, a: Person, b: Person): Kin {
  const base = k.aCalls.split(/[\s/(]/)[0] ?? '';
  const en = `${k.en}'s ${male(b) ? 'husband' : 'wife'}`;
  const path = [...k.path, b];
  const suffix = `${male(b) ? 'rể' : 'dâu'}${k.vi.includes('họ') ? ' (họ)' : ''}`;

  switch (base) {
    case 'con':
      return kin([`con ${suffix}`, en], 'con', parentTerm(a), path);
    case 'cháu':
    case 'chắt':
    case 'chút':
      return kin([`${base} ${suffix}`, en], base, k.bCalls, path);
    case 'anh':
      return kin([`chị dâu${suffix.slice(3)}`, en], 'chị', k.bCalls, path);
    case 'chị':
      return kin([`anh rể${suffix.slice(2)}`, en], 'anh', k.bCalls, path);
    case 'em':
      return kin([`em ${suffix}`, en], 'em', k.bCalls, path);
    case 'bác':
      return kin(['bác gái', en], 'bác', 'cháu', path);
    case 'chú':
      return kin(['thím', en], 'thím', 'cháu', path);
    case 'cậu':
      return kin(['mợ', en], 'mợ', 'cháu', path);
    case 'cô':
    case 'dì':
      return kin(['dượng', en], 'dượng', 'cháu', path);
    case 'bố':
    case 'mẹ':
      return kin(
        male(b) ? ['bố dượng', 'stepfather'] : ['mẹ kế', 'stepmother'],
        male(b) ? 'dượng' : 'dì',
        'con',
        path,
      );

    default: {
      const t = male(b) ? 'ông' : 'bà';

      return kin([t, en], t, k.bCalls, path);
    }
  }
}

/** B is a blood relative of A's spouse S, described by k (from S's view). */
function inLawViaSpouse(k: Kin, a: Person, b: Person): Kin {
  const side = male(a) ? 'vợ' : 'chồng';
  const sideEn = male(a) ? "wife's" : "husband's";
  const base = k.vi.split(/[\s/(]/)[0] ?? '';
  const path = [a, ...k.path];
  if (base === 'bố' || base === 'mẹ')
    return kin(
      [`${base} ${side}`, male(b) ? 'father-in-law' : 'mother-in-law'],
      k.aCalls,
      'con',
      path,
    );
  if (base === 'anh' || base === 'chị' || base === 'em')
    return kin(
      [`${base} ${side}`, male(b) ? 'brother-in-law' : 'sister-in-law'],
      k.aCalls,
      k.bCalls === 'em' ? 'em' : sibTerm(a, true),
      path,
    );
  if (base === 'con')
    return kin(
      [`con riêng của ${side}`, `${sideEn} child (step-child)`],
      'con',
      male(a) ? 'dượng' : 'dì',
      path,
    );

  return kin(
    [`${k.vi} (bên ${side})`, `${k.en} (${sideEn} side)`],
    k.aCalls,
    k.bCalls,
    path,
  );
}

export function kinship(
  people: Person[],
  aId: string,
  bId: string,
): Kin | null {
  const byId = new Map(people.map((p) => [p.id, p]));
  const order = new Map(people.map((p, i) => [p.id, i]));
  const a = byId.get(aId);
  const b = byId.get(bId);
  if (!a || !b) return null;
  if (a === b) return kin(['chính mình', 'the same person'], '—', '—', [a]);

  const ctx: Ctx = {
    byId,
    older: (x, y) =>
      x.birthYear !== undefined &&
      y.birthYear !== undefined &&
      x.birthYear !== y.birthYear
        ? x.birthYear < y.birthYear
        : (order.get(x.id) ?? 0) < (order.get(y.id) ?? 0),
  };

  const blood = bloodKin(ctx, a, b);
  if (blood) return blood;
  if (a.spouseIds.includes(b.id)) return spouseKin(a, b);

  for (const xId of b.spouseIds) {
    const x = byId.get(xId);
    const k = x && bloodKin(ctx, a, x);
    if (k) return inLawBySpouse(k, a, b);
  }

  for (const sId of a.spouseIds) {
    const s = byId.get(sId);
    const k = s && bloodKin(ctx, s, b);
    if (k) return inLawViaSpouse(k, a, b);
  }

  // Parents whose children are married to each other.
  const childOf = (p: Person, c: Person) =>
    c.fatherId === p.id || c.motherId === p.id;

  const inLawFamilies = people.some(
    (c) =>
      childOf(a, c) &&
      c.spouseIds.some((sp) => {
        const s = byId.get(sp);

        return !!s && childOf(b, s);
      }),
  );

  if (inLawFamilies)
    return kin(
      ['thông gia', "co-parent-in-law (child's spouse's parent)"],
      male(b) ? 'ông thông gia' : 'bà thông gia',
      male(a) ? 'ông thông gia' : 'bà thông gia',
      [a, b],
    );

  return null;
}
