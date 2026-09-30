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

/** Year of a stored date ("YYYY-MM-DD" or "YYYY"); undefined when unknown. */
export const yearOf = (date: string | undefined) =>
  date ? Number(date.slice(0, 4)) || undefined : undefined;

export const birthYear = (p: Person) => yearOf(p.birthDate);
export const deathYear = (p: Person) => yearOf(p.deathDate);
export const isDeceased = (p: Person) => !!p.deathDate;

/** A year, or a full "YYYY-MM-DD" date when known. */
type When = number | string;

type Opt = Partial<
  Omit<Person, 'id' | 'name' | 'gender' | 'birthDate' | 'deathDate'>
> & { died?: When };

const P = (
  id: string,
  name: string,
  gender: Gender,
  born?: When,
  { died, ...o }: Opt = {},
): Person => ({
  id,
  name,
  gender,
  birthDate: born === undefined ? undefined : String(born),
  deathDate: died === undefined ? undefined : String(died),
  spouseIds: [],
  ...o,
});

export const seedPeople: Person[] = [
  P('p1', 'Nguyễn Văn An', 'male', '1900-03-12', {
    courtesyName: 'Phúc Hậu',
    spouseIds: ['p2'],
    died: '1970-11-10',
  }),
  P('p2', 'Trần Thị Bình', 'female', '1904-03-23', {
    courtesyName: 'Từ Tâm',
    spouseIds: ['p1'],
    fatherId: 'p3',
    motherId: 'p4',
    died: '1978-11-08',
  }),
  P('p3', 'Trần Văn Cường', 'male', '1875-10-06', {
    spouseIds: ['p4'],
    died: '1940-03-23',
  }),
  P('p4', 'Lê Thị Dung', 'female', '1878-05-17', {
    spouseIds: ['p3'],
    died: '1945-08-27',
  }),
  P('p5', 'Nguyễn Văn Đức', 'male', '1925-10-02', {
    courtesyName: 'Minh Đức',
    fatherId: 'p1',
    motherId: 'p2',
    spouseIds: ['p8'],
    died: '1995-12-24',
  }),
  P('p6', 'Nguyễn Thị Hoa', 'female', '1928-07-11', {
    fatherId: 'p1',
    motherId: 'p2',
    spouseIds: ['p11'],
    died: '2001-02-14',
  }),
  P('p7', 'Nguyễn Văn Khang', 'male', '1931-02-22', {
    courtesyName: 'Khang Ninh',
    fatherId: 'p1',
    motherId: 'p2',
    spouseIds: ['p12'],
    died: '2008-11-22',
  }),
  P('p8', 'Phạm Thị Lan', 'female', '1927-09-05', {
    fatherId: 'p9',
    motherId: 'p10',
    spouseIds: ['p5'],
    died: '2003-05-09',
  }),
  P('p9', 'Phạm Văn Minh', 'male', '1898-04-16', {
    spouseIds: ['p10'],
    died: '1961-01-17',
  }),
  P('p10', 'Hoàng Thị Nga', 'female', '1901-11-27', {
    spouseIds: ['p9'],
    died: '1966-04-07',
  }),
  P('p11', 'Lê Văn Phúc', 'male', '1926-06-10', {
    spouseIds: ['p6'],
    died: '1990-08-20',
  }),
  P('p12', 'Đỗ Thị Quyên', 'female', '1934-01-21', {
    fatherId: 'p13',
    motherId: 'p14',
    spouseIds: ['p7'],
    died: '2012-12-30',
  }),
  P('p13', 'Đỗ Văn Sơn', 'male', '1905-08-04', {
    spouseIds: ['p14'],
    died: '1972-06-15',
  }),
  P('p14', 'Vũ Thị Tâm', 'female', '1908-03-15', {
    spouseIds: ['p13'],
    died: '1980-10-22',
  }),
  P('p15', 'Trần Văn Tùng', 'male', '1907-10-26', {
    fatherId: 'p3',
    motherId: 'p4',
    spouseIds: ['p16'],
    died: '1975-11-04',
  }),
  P('p16', 'Bùi Thị Uyên', 'female', '1910-05-09', {
    spouseIds: ['p15'],
    died: '1985-09-22',
  }),
  P('p17', 'Trần Thị Vân', 'female', '1935-12-20', {
    fatherId: 'p15',
    motherId: 'p16',
  }),
  P('p18', 'Nguyễn Văn Bảo', 'male', '1950-02-18', {
    fatherId: 'p5',
    motherId: 'p8',
    spouseIds: ['p28'],
  }),
  P('p19', 'Nguyễn Thị Cúc', 'female', '1953-02-14', {
    fatherId: 'p5',
    motherId: 'p8',
    spouseIds: ['p29'],
  }),
  P('p20', 'Nguyễn Văn Dũng', 'male', '1956-09-25', {
    fatherId: 'p5',
    motherId: 'p8',
    spouseIds: ['p30'],
  }),
  P('p21', 'Lê Văn Giang', 'male', '1951-04-08', {
    fatherId: 'p11',
    motherId: 'p6',
    spouseIds: ['p39'],
  }),
  P('p22', 'Lê Thị Hạnh', 'female', '1955-11-19', {
    fatherId: 'p11',
    motherId: 'p6',
    spouseIds: ['p31'],
  }),
  P('p23', 'Nguyễn Văn Hùng', 'male', '1958-06-02', {
    fatherId: 'p7',
    motherId: 'p12',
    spouseIds: ['p32'],
  }),
  P('p24', 'Nguyễn Thị Kim', 'female', '1961-01-13', {
    fatherId: 'p7',
    motherId: 'p12',
    spouseIds: ['p33'],
  }),
  P('p25', 'Phạm Văn Long', 'male', '1930-08-24', {
    fatherId: 'p9',
    motherId: 'p10',
    spouseIds: ['p26'],
    died: '2010-12-05',
  }),
  P('p26', 'Ngô Thị Mai', 'female', 1933, { spouseIds: ['p25'] }),
  P('p27', 'Phạm Thị Ngọc', 'female', '1960-10-18', {
    fatherId: 'p25',
    motherId: 'p26',
    spouseIds: ['p50'],
  }),
  P('p28', 'Hồ Thị Oanh', 'female', 1952, { spouseIds: ['p18'] }),
  P('p29', 'Đặng Văn Quang', 'male', '1950-12-12', {
    spouseIds: ['p19'],
  }),
  P('p30', 'Vương Thị Sen', 'female', '1958-07-23', {
    spouseIds: ['p20'],
  }),
  P('p31', 'Tạ Văn Thành', 'male', '1953-02-06', {
    spouseIds: ['p22'],
  }),
  P('p32', 'Lý Thị Thu', 'female', '1960-09-17', {
    spouseIds: ['p23'],
  }),
  P('p33', 'Mai Văn Toàn', 'male', '1959-04-28', {
    spouseIds: ['p24'],
  }),
  P('p34', 'Nguyễn Văn Anh', 'male', '1978-07-21', {
    fatherId: 'p18',
    motherId: 'p28',
    spouseIds: ['p45'],
  }),
  P('p35', 'Nguyễn Thị Bích', 'female', '1981-06-22', {
    fatherId: 'p18',
    motherId: 'p28',
  }),
  P('p36', 'Đặng Văn Châu', 'male', '1976-01-05', {
    fatherId: 'p29',
    motherId: 'p19',
  }),
  P('p37', 'Nguyễn Văn Duy', 'male', '1982-08-16', {
    fatherId: 'p20',
    motherId: 'p30',
  }),
  P('p38', 'Nguyễn Thị Giao', 'female', '1985-03-27', {
    fatherId: 'p20',
    motherId: 'p30',
  }),
  P('p39', 'Châu Thị Hằng', 'female', 1954, { spouseIds: ['p21'] }),
  P('p40', 'Lê Văn Hiếu', 'male', '1979-05-21', {
    fatherId: 'p21',
    motherId: 'p39',
  }),
  P('p41', 'Tạ Thị Hương', 'female', '1980-12-04', {
    fatherId: 'p31',
    motherId: 'p22',
  }),
  P('p42', 'Nguyễn Văn Khoa', 'male', '1984-07-15', {
    fatherId: 'p23',
    motherId: 'p32',
    spouseIds: ['p48'],
  }),
  P('p43', 'Nguyễn Thị Linh', 'female', '1987-02-26', {
    fatherId: 'p23',
    motherId: 'p32',
  }),
  P('p44', 'Mai Văn Lực', 'male', '1986-09-09', {
    fatherId: 'p33',
    motherId: 'p24',
  }),
  P('p45', 'Trịnh Thị My', 'female', 1980, { spouseIds: ['p34'] }),
  P('p46', 'Nguyễn Văn Nam', 'male', '2005-09-14', {
    fatherId: 'p34',
    motherId: 'p45',
  }),
  P('p47', 'Nguyễn Thị Nhi', 'female', '2008-06-14', {
    fatherId: 'p34',
    motherId: 'p45',
  }),
  P('p48', 'Kiều Thị Phương', 'female', '1986-01-25', {
    spouseIds: ['p42'],
  }),
  P('p49', 'Nguyễn Văn Quân', 'male', '2010-08-08', {
    fatherId: 'p42',
    motherId: 'p48',
  }),
  P('p50', 'Cao Văn Sang', 'male', 1958, { spouseIds: ['p27'] }),
];

/** Lookup map by id. */
export const indexById = (people: Person[]) =>
  new Map(people.map((p) => [p.id, p]));

export const childrenOf = (people: Person[], id: string) =>
  people.filter((p) => p.fatherId === id || p.motherId === id);

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
export const surname = (p: Person) => p.name.split(' ')[0] ?? '';

/** Given name: the last word of a Vietnamese full name. */
export const givenName = (p: Person) => p.name.split(' ').pop() ?? p.name;

/** "1925–1995", "1950" or "?" */
export const lifespan = (p: Person) => {
  const died = deathYear(p);

  return `${birthYear(p) ?? '?'}${died ? `–${died}` : ''}`;
};

/** Accent-insensitive lowercase, so "Duc" matches "Đức". */
const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

export const matches = (p: Person, q: string) =>
  norm(`${p.name} ${p.courtesyName ?? ''} ${birthYear(p) ?? ''}`).includes(
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
  const byId = indexById(people);
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
  const byId = indexById(people);
  let best: { id: string; size: number; year: number } | undefined;

  people.forEach((p) => {
    if (
      (p.fatherId && byId.has(p.fatherId)) ||
      (p.motherId && byId.has(p.motherId))
    )
      return;
    const size = houseOf(people, p.id).size;
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
  const byId = indexById(people);
  const levels = new Map<string, number>();
  const root = mainRootId(people);
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
    childrenOf(people, id).forEach((c) => visit(c.id, level + 1));
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
