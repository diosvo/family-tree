import type { CSSProperties } from 'react';

export type Gender = 'male' | 'female';
export type Person = {
  id: string;
  name: string;
  courtesyName?: string | undefined;
  birthYear?: number | undefined;
  deathYear?: number | undefined;
  memorial?: string | undefined; // "MM-DD" death anniversary
  gender: Gender;
  fatherId?: string | undefined;
  motherId?: string | undefined;
  spouseIds: string[];
};

type Opt = Partial<Omit<Person, 'id' | 'name' | 'gender' | 'birthYear'>>;

const P = (
  id: string,
  name: string,
  gender: Gender,
  birthYear?: number,
  o: Opt = {},
): Person => ({
  id,
  name,
  gender,
  birthYear,
  spouseIds: [],
  ...o,
});

export const seedPeople: Person[] = [
  P('p1', 'Nguyễn Văn An', 'male', 1900, {
    courtesyName: 'Phúc Hậu',
    spouseIds: ['p2'],
    deathYear: 1970,
    memorial: '10-12',
  }),
  P('p2', 'Trần Thị Bình', 'female', 1904, {
    courtesyName: 'Từ Tâm',
    spouseIds: ['p1'],
    fatherId: 'p3',
    motherId: 'p4',
    deathYear: 1978,
    memorial: '10-08',
  }),
  P('p3', 'Trần Văn Cường', 'male', 1875, {
    spouseIds: ['p4'],
    deathYear: 1940,
    memorial: '02-15',
  }),
  P('p4', 'Lê Thị Dung', 'female', 1878, {
    spouseIds: ['p3'],
    deathYear: 1945,
    memorial: '07-20',
  }),
  P('p5', 'Nguyễn Văn Đức', 'male', 1925, {
    courtesyName: 'Minh Đức',
    fatherId: 'p1',
    motherId: 'p2',
    spouseIds: ['p8'],
    deathYear: 1995,
    memorial: '11-03',
  }),
  P('p6', 'Nguyễn Thị Hoa', 'female', 1928, {
    fatherId: 'p1',
    motherId: 'p2',
    spouseIds: ['p11'],
    deathYear: 2001,
    memorial: '01-22',
  }),
  P('p7', 'Nguyễn Văn Khang', 'male', 1931, {
    courtesyName: 'Khang Ninh',
    fatherId: 'p1',
    motherId: 'p2',
    spouseIds: ['p12'],
    deathYear: 2008,
    memorial: '10-25',
  }),
  P('p8', 'Phạm Thị Lan', 'female', 1927, {
    fatherId: 'p9',
    motherId: 'p10',
    spouseIds: ['p5'],
    deathYear: 2003,
    memorial: '04-09',
  }),
  P('p9', 'Phạm Văn Minh', 'male', 1898, {
    spouseIds: ['p10'],
    deathYear: 1960,
    memorial: '12-01',
  }),
  P('p10', 'Hoàng Thị Nga', 'female', 1901, {
    spouseIds: ['p9'],
    deathYear: 1966,
    memorial: '03-17',
  }),
  P('p11', 'Lê Văn Phúc', 'male', 1926, {
    spouseIds: ['p6'],
    deathYear: 1990,
    memorial: '06-30',
  }),
  P('p12', 'Đỗ Thị Quyên', 'female', 1934, {
    fatherId: 'p13',
    motherId: 'p14',
    spouseIds: ['p7'],
    deathYear: 2012,
    memorial: '11-18',
  }),
  P('p13', 'Đỗ Văn Sơn', 'male', 1905, {
    spouseIds: ['p14'],
    deathYear: 1972,
    memorial: '05-05',
  }),
  P('p14', 'Vũ Thị Tâm', 'female', 1908, {
    spouseIds: ['p13'],
    deathYear: 1980,
    memorial: '09-14',
  }),
  P('p15', 'Trần Văn Tùng', 'male', 1907, {
    fatherId: 'p3',
    motherId: 'p4',
    spouseIds: ['p16'],
    deathYear: 1975,
    memorial: '10-02',
  }),
  P('p16', 'Bùi Thị Uyên', 'female', 1910, {
    spouseIds: ['p15'],
    deathYear: 1985,
    memorial: '08-08',
  }),
  P('p17', 'Trần Thị Vân', 'female', 1935, {
    fatherId: 'p15',
    motherId: 'p16',
  }),
  P('p18', 'Nguyễn Văn Bảo', 'male', 1950, {
    fatherId: 'p5',
    motherId: 'p8',
    spouseIds: ['p28'],
  }),
  P('p19', 'Nguyễn Thị Cúc', 'female', 1953, {
    fatherId: 'p5',
    motherId: 'p8',
    spouseIds: ['p29'],
  }),
  P('p20', 'Nguyễn Văn Dũng', 'male', 1956, {
    fatherId: 'p5',
    motherId: 'p8',
    spouseIds: ['p30'],
  }),
  P('p21', 'Lê Văn Giang', 'male', 1951, {
    fatherId: 'p11',
    motherId: 'p6',
    spouseIds: ['p39'],
  }),
  P('p22', 'Lê Thị Hạnh', 'female', 1955, {
    fatherId: 'p11',
    motherId: 'p6',
    spouseIds: ['p31'],
  }),
  P('p23', 'Nguyễn Văn Hùng', 'male', 1958, {
    fatherId: 'p7',
    motherId: 'p12',
    spouseIds: ['p32'],
  }),
  P('p24', 'Nguyễn Thị Kim', 'female', 1961, {
    fatherId: 'p7',
    motherId: 'p12',
    spouseIds: ['p33'],
  }),
  P('p25', 'Phạm Văn Long', 'male', 1930, {
    fatherId: 'p9',
    motherId: 'p10',
    spouseIds: ['p26'],
    deathYear: 2010,
    memorial: '10-30',
  }),
  P('p26', 'Ngô Thị Mai', 'female', 1933, { spouseIds: ['p25'] }),
  P('p27', 'Phạm Thị Ngọc', 'female', 1960, {
    fatherId: 'p25',
    motherId: 'p26',
    spouseIds: ['p50'],
  }),
  P('p28', 'Hồ Thị Oanh', 'female', 1952, { spouseIds: ['p18'] }),
  P('p29', 'Đặng Văn Quang', 'male', 1950, { spouseIds: ['p19'] }),
  P('p30', 'Vương Thị Sen', 'female', 1958, { spouseIds: ['p20'] }),
  P('p31', 'Tạ Văn Thành', 'male', 1953, { spouseIds: ['p22'] }),
  P('p32', 'Lý Thị Thu', 'female', 1960, { spouseIds: ['p23'] }),
  P('p33', 'Mai Văn Toàn', 'male', 1959, { spouseIds: ['p24'] }),
  P('p34', 'Nguyễn Văn Anh', 'male', 1978, {
    fatherId: 'p18',
    motherId: 'p28',
    spouseIds: ['p45'],
  }),
  P('p35', 'Nguyễn Thị Bích', 'female', 1981, {
    fatherId: 'p18',
    motherId: 'p28',
  }),
  P('p36', 'Đặng Văn Châu', 'male', 1976, { fatherId: 'p29', motherId: 'p19' }),
  P('p37', 'Nguyễn Văn Duy', 'male', 1982, {
    fatherId: 'p20',
    motherId: 'p30',
  }),
  P('p38', 'Nguyễn Thị Giao', 'female', 1985, {
    fatherId: 'p20',
    motherId: 'p30',
  }),
  P('p39', 'Châu Thị Hằng', 'female', 1954, { spouseIds: ['p21'] }),
  P('p40', 'Lê Văn Hiếu', 'male', 1979, { fatherId: 'p21', motherId: 'p39' }),
  P('p41', 'Tạ Thị Hương', 'female', 1980, {
    fatherId: 'p31',
    motherId: 'p22',
  }),
  P('p42', 'Nguyễn Văn Khoa', 'male', 1984, {
    fatherId: 'p23',
    motherId: 'p32',
    spouseIds: ['p48'],
  }),
  P('p43', 'Nguyễn Thị Linh', 'female', 1987, {
    fatherId: 'p23',
    motherId: 'p32',
  }),
  P('p44', 'Mai Văn Lực', 'male', 1986, { fatherId: 'p33', motherId: 'p24' }),
  P('p45', 'Trịnh Thị My', 'female', 1980, { spouseIds: ['p34'] }),
  P('p46', 'Nguyễn Văn Nam', 'male', 2005, {
    fatherId: 'p34',
    motherId: 'p45',
  }),
  P('p47', 'Nguyễn Thị Nhi', 'female', 2008, {
    fatherId: 'p34',
    motherId: 'p45',
  }),
  P('p48', 'Kiều Thị Phương', 'female', 1986, { spouseIds: ['p42'] }),
  P('p49', 'Nguyễn Văn Quân', 'male', 2010, {
    fatherId: 'p42',
    motherId: 'p48',
  }),
  P('p50', 'Cao Văn Sang', 'male', 1958, { spouseIds: ['p27'] }),
];

const index = (people: Person[]) => new Map(people.map((p) => [p.id, p]));

export const childrenOf = (people: Person[], id: string) =>
  people.filter((p) => p.fatherId === id || p.motherId === id);

export const siblingsOf = (people: Person[], p: Person) =>
  people.filter(
    (x) =>
      x.id !== p.id &&
      ((p.fatherId && x.fatherId === p.fatherId) ||
        (p.motherId && x.motherId === p.motherId)),
  );

export const isAlive = (p: Person) => !p.deathYear;

export const genderColor = (g: Gender) =>
  g === 'male' ? 'var(--male)' : 'var(--female)';

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
export const surname = (p: Person) => p.name.split(' ')[0] ?? '';

/** "1925–1995", "1950" or "?" */
export const lifespan = (p: Person) =>
  `${p.birthYear ?? '?'}${p.deathYear ? `–${p.deathYear}` : ''}`;

/** Accent-insensitive lowercase, so "Duc" matches "Đức". */
const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

export const matches = (p: Person, q: string) =>
  norm(`${p.name} ${p.courtesyName ?? ''} ${p.birthYear ?? ''}`).includes(
    norm(q),
  );

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
export function houseOf(
  people: Person[],
  id: string,
  maxGen = Infinity,
): Set<string> {
  const byId = index(people);
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
    childrenOf(people, p.id).forEach((c) => down(c, gen + 1));
  };

  down(top, 1);

  return out;
}

/** Ancestor of the largest house: the tree shown by default. */
export function mainRootId(people: Person[]) {
  const byId = index(people);
  let best: { id: string; size: number; year: number } | undefined;

  people.forEach((p) => {
    if (
      (p.fatherId && byId.has(p.fatherId)) ||
      (p.motherId && byId.has(p.motherId))
    )
      return;
    const size = houseOf(people, p.id).size;
    const year = p.birthYear ?? Infinity;
    if (!best || size > best.size || (size === best.size && year < best.year))
      best = { id: p.id, size, year };
  });

  return best?.id;
}

/** Add a person plus spouses, parents and siblings so they attach to the tree. */
export function reveal(people: Person[], shown: Set<string>, id: string) {
  const byId = index(people);
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
  const byId = index(people);
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

/** Add every child of a person (with their spouses). */
export function revealChildren(
  people: Person[],
  shown: Set<string>,
  id: string,
) {
  const byId = index(people);
  const next = new Set(shown);

  childrenOf(people, id).forEach((c) => {
    next.add(c.id);
    c.spouseIds.forEach((s) => byId.has(s) && next.add(s));
  });

  return next;
}
