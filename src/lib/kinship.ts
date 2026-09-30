import { birthYear, indexById } from './family-data';

import type { Person } from './family-data';
import type { Lang } from './i18n';

/**
 * Regional terms of address. North and South share the same system but differ
 * in a few kinship words and naming conventions.
 */
export type Region = 'north' | 'south';
export const REGIONS: Region[] = ['north', 'south'];

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
  region: Region;
};

const male = (p: Person) => p.gender === 'male';
const north = (r: Region) => r === 'north';

const parentTerm = (r: Region, p: Person) =>
  male(p) ? (north(r) ? 'bố' : 'ba') : north(r) ? 'mẹ' : 'má';

const grandTerm = (p: Person, side: 'nội' | 'ngoại') =>
  `${male(p) ? 'ông' : 'bà'} ${side}`;

/** Great-grandparent (gen 3) and great-great-grandparent (gen 4). */
const greatTerm = (r: Region, p: Person, gen: number) => {
  if (gen > 4) return 'tổ tiên';
  if (north(r)) return gen === 3 ? 'cụ' : 'kị';

  return `${male(p) ? 'ông' : 'bà'} ${gen === 3 ? 'cố' : 'sơ'}`;
};

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

function uncleTerm(
  r: Region,
  u: Person,
  viaParent: Person,
  senior: boolean,
): [string, string] {
  if (male(viaParent)) {
    if (male(u))
      return senior
        ? ['bác', "father's older brother"]
        : ['chú', "father's younger brother"];

    // North: father's older sister is bác. South: cô regardless of age.
    return senior && north(r)
      ? ['bác', "father's older sister"]
      : ['cô', "father's sister"];
  }

  // North: mother's older siblings are bác. South: cậu / dì regardless of age.
  if (senior && north(r))
    return [
      'bác',
      male(u) ? "mother's older brother" : "mother's older sister",
    ];

  return male(u) ? ['cậu', "mother's brother"] : ['dì', "mother's sister"];
}

function elderTerms(
  r: Region,
  b: Person,
  sib: Person,
  senior: boolean,
  gensAbove: number,
): [string, string, string, string] {
  const [term, en] = uncleTerm(r, b, sib, senior);
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

  const great = greatTerm(r, b, 3);

  return [great, `great-great-${male(b) ? 'uncle' : 'aunt'}`, great, 'chắt'];
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

  const { older, region: r } = ctx;

  // B descends from A.
  if (ga === 0) {
    if (gb === 1)
      return kin(
        male(b) ? ['con trai', 'son'] : ['con gái', 'daughter'],
        'con',
        parentTerm(r, a),
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
      greatTerm(r, a, gb),
      path,
    );
  }

  // B is an ancestor of A.
  if (gb === 0) {
    if (ga === 1)
      return kin(
        [parentTerm(r, b), male(b) ? 'father' : 'mother'],
        parentTerm(r, b),
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
        greatTerm(r, b, ga),
        ga === 3 ? 'great-grandparent' : 'great-great-grandparent',
      ],
      greatTerm(r, b, ga),
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

    const [vi, en, aCalls, bCalls] = elderTerms(
      r,
      b,
      sib,
      older(b, sib),
      ga - 1,
    );

    return kin([vi, en], aCalls, bCalls, path);
  }

  // B descends from A's sibling: nephew / niece level.
  if (ga === 1) {
    const sib = chainB[gb - 2]; // B's ancestor who is A's sibling
    const [, , bCalls, aCalls] = elderTerms(r, a, sib, older(a, sib), gb - 1);

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

    const [vi, en, aCalls, bCalls] = elderTerms(
      r,
      b,
      chainA[d - 1],
      seniorB,
      d,
    );

    return kin([`${vi} (họ)`, `${en} (distant)`], aCalls, bCalls, path);
  }

  // B belongs to a younger generation.
  const d = gb - ga;
  const [, , bCalls, aCalls] = elderTerms(r, a, chainB[d - 1], !seniorB, d);

  return kin(['cháu (họ)', 'distant nephew / niece'], aCalls, bCalls, path);
}

const spouseKin = (a: Person, b: Person): Kin =>
  kin(
    male(b) ? ['chồng', 'husband'] : ['vợ', 'wife'],
    male(b) ? 'anh / mình' : 'em / mình',
    male(a) ? 'anh / mình' : 'em / mình',
    [a, b],
  );

const PARENT_WORDS = ['bố', 'mẹ', 'ba', 'má'];

/** B is the spouse of X, where X is A's blood relative described by k. */
function inLawBySpouse(r: Region, k: Kin, a: Person, b: Person): Kin {
  const base = k.aCalls.split(/[\s/(]/)[0] ?? '';
  const en = `${k.en}'s ${male(b) ? 'husband' : 'wife'}`;
  const path = [...k.path, b];
  const suffix = `${male(b) ? 'rể' : 'dâu'}${k.vi.includes('họ') ? ' (họ)' : ''}`;

  if (PARENT_WORDS.includes(base))
    return kin(
      male(b)
        ? [`${parentTerm(r, b)} dượng`, 'stepfather']
        : ['mẹ kế', 'stepmother'],
      male(b) ? 'dượng' : 'dì',
      'con',
      path,
    );

  if (base === 'cô' || base === 'dì') {
    // North: an aunt's husband is chú. South: dượng.
    const t = north(r) ? 'chú' : 'dượng';

    return kin([t, en], t, 'cháu', path);
  }

  switch (base) {
    case 'con':
      return kin([`con ${suffix}`, en], 'con', parentTerm(r, a), path);
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
      return kin([male(b) ? 'bác' : 'bác gái', en], 'bác', 'cháu', path);
    case 'chú':
      return kin(['thím', en], 'thím', 'cháu', path);
    case 'cậu':
      return kin(['mợ', en], 'mợ', 'cháu', path);

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
  if (PARENT_WORDS.includes(base))
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
  region: Region = 'north',
): Kin | null {
  const byId = indexById(people);
  const order = new Map(people.map((p, i) => [p.id, i]));
  const a = byId.get(aId);
  const b = byId.get(bId);
  if (!a || !b) return null;
  if (a === b) return kin(['chính mình', 'the same person'], '—', '—', [a]);

  const ctx: Ctx = {
    byId,
    region,
    older: (x, y) => {
      const bx = birthYear(x);
      const by = birthYear(y);

      return bx !== undefined && by !== undefined && bx !== by
        ? bx < by
        : (order.get(x.id) ?? 0) < (order.get(y.id) ?? 0);
    },
  };

  const blood = bloodKin(ctx, a, b);
  if (blood) return blood;
  if (a.spouseIds.includes(b.id)) return spouseKin(a, b);

  for (const xId of b.spouseIds) {
    const x = byId.get(xId);
    const k = x && bloodKin(ctx, a, x);
    if (k) return inLawBySpouse(region, k, a, b);
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

/** Relationship label in the UI language; English keeps the Vietnamese term. */
export const kinLabel = (k: Kin, lang: Lang) =>
  lang === 'vi' ? k.vi : `${k.en} (${k.vi})`;
