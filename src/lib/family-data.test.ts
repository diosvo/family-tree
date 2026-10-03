import { describe, expect, it } from 'vitest';

import { person as P, marry } from '@/test/people';

import {
  childrenIndex,
  courtesyNameText,
  descendantsOf,
  familyAround,
  genderVars,
  generationLevels,
  givenName,
  hiddenChildren,
  houseOf,
  isDeceased,
  lifespan,
  mainRootId,
  matches,
  reveal,
  revealChildren,
  surname,
  yearOf,
} from './family-data';

/*
 *   a ─ aw                 x ─ xw   (a smaller house)
 *   ├─ son ─ sw            └─ xs
 *   │  └─ gs
 *   └─ dau ─ dh ← dhf
 *      └─ dk (belongs to dh's house)
 */
const people = marry(
  [
    P('a', 'male', 1900),
    P('aw', 'female', 1902),
    P('son', 'male', 1925, { fatherId: 'a', motherId: 'aw' }),
    P('sw', 'female', 1927),
    P('gs', 'male', 1950, { fatherId: 'son', motherId: 'sw' }),
    P('dau', 'female', 1928, { fatherId: 'a', motherId: 'aw' }),
    P('dhf', 'male', 1890),
    P('dh', 'male', 1926, { fatherId: 'dhf' }),
    P('dk', 'female', 1955, { fatherId: 'dh', motherId: 'dau' }),
    P('x', 'male', 1910),
    P('xw', 'female', 1912),
    P('xs', 'male', 1940, { fatherId: 'x', motherId: 'xw' }),
  ],
  ['a', 'aw'],
  ['son', 'sw'],
  ['dau', 'dh'],
  ['x', 'xw'],
);

const ids = (s: Iterable<string>) => [...s].sort();

describe('houseOf', () => {
  it('follows sons; daughters stay but their children go to the husband’s house', () => {
    expect(ids(houseOf(people, 'gs'))).toEqual(
      ids(['a', 'aw', 'son', 'sw', 'gs', 'dau', 'dh']),
    );
  });

  it('caps the generations shown', () => {
    expect(ids(houseOf(people, 'a', 1))).toEqual(['a', 'aw']);
  });

  it('starts from the top of the father line', () => {
    expect(houseOf(people, 'dk').has('dhf')).toBe(true);
  });
});

describe('mainRootId and generationLevels', () => {
  it('picks the ancestor of the largest house', () => {
    expect(mainRootId(people)).toBe('a');
    expect(mainRootId([])).toBeUndefined();
  });

  it('counts generations from the root, in-laws’ parents above it', () => {
    const levels = generationLevels(people);
    expect(levels.get('a')).toBe(1);
    expect(levels.get('aw')).toBe(1);
    expect(levels.get('gs')).toBe(3);
    expect(levels.get('dk')).toBe(3);
    expect(levels.get('dhf')).toBe(1);
    expect(levels.has('x')).toBe(false);
  });
});

describe('indexes', () => {
  it('lists children under each parent once', () => {
    const kids = childrenIndex(people);
    expect(kids.get('a')?.map((p) => p.id)).toEqual(['son', 'dau']);
    expect(kids.get('dau')?.map((p) => p.id)).toEqual(['dk']);
  });

  it('finds every descendant', () => {
    expect(ids(descendantsOf(people, 'a'))).toEqual(
      ids(['son', 'gs', 'dau', 'dk']),
    );

    expect(descendantsOf(people, 'gs').size).toBe(0);
  });

  it('counts the children each shown person has hidden', () => {
    const hidden = hiddenChildren(people, new Set(['a', 'aw', 'son']));
    expect(hidden.get('a')).toBe(1); // dau
    expect(hidden.get('son')).toBe(1); // gs
    expect(hidden.has('aw')).toBe(true);
    // Shown people without children are left out
    expect(hiddenChildren(people, new Set(['gs'])).size).toBe(0);
  });
});

describe('revealing people in the tree', () => {
  it('adds a person with spouses, parents and siblings', () => {
    expect(ids(reveal(people, new Set(), 'son'))).toEqual(
      ids(['son', 'sw', 'a', 'aw', 'dau', 'dh']),
    );
  });

  it('adds children with their spouses', () => {
    expect(ids(revealChildren(people, new Set(['a']), 'a'))).toEqual(
      ids(['a', 'son', 'sw', 'dau', 'dh']),
    );
  });

  it('frames the close family', () => {
    expect(ids(familyAround(people, 'son'))).toEqual(
      ids(['son', 'sw', 'a', 'aw', 'dau', 'gs']),
    );
  });
});

describe('text helpers', () => {
  const duc = P('duc', 'male', 1925, {
    name: 'Nguyễn Văn Đức',
    courtesyName: 'Phúc',
    deathDate: '1995-01-01',
  });

  it('matches without accents, by courtesy name and by year', () => {
    expect(matches(duc, 'duc')).toBe(true);
    expect(matches(duc, 'NGUYEN VAN')).toBe(true);
    expect(matches(duc, 'phuc')).toBe(true);
    expect(matches(duc, '1925')).toBe(true);
    expect(matches(duc, '1995')).toBe(true);
    expect(matches(duc, 'minh')).toBe(false);
  });

  it('formats names and lifespans', () => {
    expect(surname(duc)).toBe('Nguyễn');
    expect(lifespan(duc)).toBe('1925–1995');
    expect(lifespan(P('n', 'male'))).toBe('?');
  });

  it('reads years, and nothing from unknown dates', () => {
    expect(yearOf('1925-10-02')).toBe(1925);
    expect(yearOf('????')).toBeUndefined();
    expect(yearOf(undefined)).toBeUndefined();
  });

  it('formats the small details', () => {
    const lan = P('lan', 'female', 1950, {
      name: 'Trần Thị Lan',
      courtesyName: 'Từ',
    });

    expect(isDeceased(lan)).toBe(false);
    expect(isDeceased({ ...lan, deathDate: '2000' })).toBe(true);
    expect(courtesyNameText(lan)).toBe('(Từ)');
    expect(courtesyNameText(P('x', 'male'))).toBe('');
    expect(givenName(lan)).toBe('Lan');
    expect(givenName(P('Mononym', 'male'))).toBe('Mononym');

    expect(genderVars('female')).toEqual({
      '--c': 'var(--female)',
      '--c-soft': 'var(--female-soft)',
    });

    expect(matches(P('x', 'male'), 'x')).toBe(true);
  });
});

describe('edge cases', () => {
  it('handles unknown people', () => {
    expect(houseOf(people, 'ghost').size).toBe(0);
    expect(reveal(people, new Set(['a']), 'ghost')).toEqual(new Set(['a']));
    expect(familyAround(people, 'ghost')).toEqual([]);
    expect(generationLevels([]).size).toBe(0);
  });

  it('reveals someone whose parents are not saved', () => {
    const lone = [P('solo', 'male', 1990, { fatherId: 'gone' })];
    expect(ids(reveal(lone, new Set(), 'solo'))).toEqual(['solo']);
  });

  it('does not loop on a corrupt cycle of parents', () => {
    const cycle = [
      P('c1', 'male', 1900, { fatherId: 'c2' }),
      P('c2', 'male', 1920, { fatherId: 'c1' }),
    ];

    expect(ids(houseOf(cycle, 'c1'))).toEqual(['c1', 'c2']);
    expect(ids(descendantsOf(cycle, 'c1'))).toEqual(['c2']);
  });

  it('follows the mother when no father is known', () => {
    const line = [
      P('m', 'female', 1900),
      P('d', 'female', 1925, { motherId: 'm' }),
    ];

    expect(ids(houseOf(line, 'd'))).toEqual(['d', 'm']);
    expect(mainRootId(line)).toBe('m');
  });

  it('prefers the older root when houses tie, unknown years last', () => {
    expect(mainRootId([P('young', 'male', 1950), P('old', 'male', 1900)])).toBe(
      'old',
    );

    expect(mainRootId([P('unknown', 'male'), P('known', 'male', 1900)])).toBe(
      'known',
    );
  });
});
