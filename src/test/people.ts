import type { Gender, Person } from '@/lib/family-data';

/** A person for tests: `id`, gender, birth year, then any other fields. */
export const person = (
  id: string,
  gender: Gender,
  born?: number,
  rest: Partial<Person> = {},
): Person => ({
  id,
  name: id,
  gender,
  birthDate: born === undefined ? undefined : String(born),
  spouseIds: [],
  ...rest,
});

/** Mark each pair as married, both ways. */
export function marry(people: Person[], ...pairs: Array<[string, string]>) {
  const byId = new Map(people.map((p) => [p.id, p]));

  for (const [a, b] of pairs) {
    byId.get(a)!.spouseIds.push(b);
    byId.get(b)!.spouseIds.push(a);
  }

  return people;
}
