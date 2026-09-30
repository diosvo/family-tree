import { useMemo, useState } from 'react';

import { Segmented } from '@/components/ui/segmented';
import { SelectField } from '@/components/ui/select-field';
import { birthYear, deathYear, isDeceased } from '@/lib/family-data';
import { useT } from '@/lib/i18n';
import { CALENDARS } from '@/lib/lunar';
import { btn } from '@/lib/utils';

import { CalendarDate, DeceasedMark } from './PersonParts';
import { PersonRow, TablePage, td, th } from './PersonTable';

import type { Gender, Person } from '@/lib/family-data';
import type { Calendar } from '@/lib/lunar';

type Filter = 'all' | Gender;

const PAGE = 10;

/** Birth year ascending; people with an unknown year come last. */
const byBirth = (a: Person, b: Person) =>
  (birthYear(a) ?? Number.MAX_SAFE_INTEGER) -
  (birthYear(b) ?? Number.MAX_SAFE_INTEGER);

/** Current age while living, age at death otherwise. */
const ageOf = (p: Person, year?: number) => {
  const born = birthYear(p);
  const end = deathYear(p) ?? year;

  return end && born ? end - born : undefined;
};

type Props = {
  people: Person[];
  /** Generation of each person counted from the root, see `generationLevels`. */
  levels: Map<string, number>;
  now: Date | null;
  onSelect: (id: string) => void;
};

export function Library({ people, levels, now, onSelect }: Props) {
  const { t } = useT();
  /** Generation level as a string for the dropdown; '' = every level. */
  const [level, setLevel] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  /** Calendar the date of birth column is shown in. */
  const [calendar, setCalendar] = useState<Calendar>('solar');
  const [limit, setLimit] = useState(PAGE);
  const year = now?.getFullYear();

  /** Levels available to pick; in-law ancestors above the root (≤ 0) are left out. */
  const levelOptions = useMemo(
    () =>
      [...new Set(levels.values())]
        .filter((l) => l >= 1)
        .sort((a, b) => a - b)
        .map((l) => ({ value: String(l), label: t('level', { n: l }) })),
    [levels, t],
  );

  const rows = useMemo(
    () =>
      people
        .filter((p) => !level || levels.get(p.id) === Number(level))
        .filter((p) => filter === 'all' || p.gender === filter)
        .sort(byBirth),
    [people, levels, level, filter],
  );

  const shown = rows.slice(0, limit);
  const remaining = rows.length - shown.length;

  const pick =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setLimit(PAGE);
    };

  return (
    <TablePage
      toolbarClassName="items-center"
      toolbar={
        <>
          <SelectField
            className="w-40"
            value={level}
            onChange={pick(setLevel)}
            emptyLabel={t('allLevels')}
            options={levelOptions}
          />
          <Segmented
            value={filter}
            onChange={pick(setFilter)}
            options={[
              { value: 'all', label: t('all') },
              { value: 'female', label: t('women') },
              { value: 'male', label: t('men') },
            ]}
          />
          <Segmented
            value={calendar}
            onChange={setCalendar}
            options={CALENDARS.map((c) => ({ value: c, label: t(c) }))}
          />
          <p className="w-full text-xs text-muted-foreground">
            {shown.length} / {rows.length} {t('people')}
          </p>
        </>
      }
    >
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={`${th} py-2`}>{t('name')}</th>
            <th className={`${th} py-2`}>{t('birth')}</th>
            <th className={`${th} hidden py-2 sm:table-cell`}>{t('died')}</th>
            <th className={`${th} py-2`}>{t('age')}</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((p) => (
            <PersonRow key={p.id} person={p} onSelect={onSelect}>
              <td className={`${td} whitespace-nowrap`}>
                <CalendarDate
                  date={p.birthDate}
                  calendar={calendar}
                  fallback="?"
                />
              </td>
              <td
                className={`${td} hidden text-muted-foreground sm:table-cell`}
              >
                <CalendarDate date={p.deathDate} calendar={calendar} />
              </td>
              <td className={`${td} text-muted-foreground`}>
                <span className="flex items-center gap-1.5">
                  {ageOf(p, year)}
                  {isDeceased(p) && <DeceasedMark />}
                </span>
              </td>
            </PersonRow>
          ))}
        </tbody>
      </table>
      {remaining > 0 && (
        <button
          onClick={() => setLimit((l) => l + PAGE)}
          className={`${btn} mt-3 w-full py-2 text-sm`}
        >
          {t('showMore', { n: Math.min(PAGE, remaining) })}
        </button>
      )}
    </TablePage>
  );
}
