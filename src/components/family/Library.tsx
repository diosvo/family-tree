import { useMemo, useState } from 'react';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { Segmented } from '@/components/ui/segmented';
import {
  courtesyNameText,
  genderColor,
  genderVars,
  isAlive,
} from '@/lib/family-data';
import { useT } from '@/lib/i18n';
import { btn } from '@/lib/utils';

import type { Gender, Person } from '@/lib/family-data';

type Filter = 'all' | Gender;
type Status = 'living' | 'deceased';
/** Sortable columns: name, birth year, and the last column (age or death year). */
type SortKey = 'name' | 'birth' | 'last';
type Sort = { key: SortKey; dir: 1 | -1 };

const PAGE = 10;
const td = 'py-2 pr-3 align-top';

/** Value of the last column: age while living, death year otherwise. */
const lastOf = (p: Person, living: boolean, year?: number) =>
  living ? (year && p.birthYear ? year - p.birthYear : undefined) : p.deathYear;

function SortHeader({
  label,
  col,
  sort,
  onSort,
}: {
  label: string;
  col: SortKey;
  sort: Sort;
  onSort: (k: SortKey) => void;
}) {
  const active = sort.key === col;
  const Icon = !active ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;

  return (
    <th className="sticky top-0 bg-background pr-3 text-left text-xs font-normal text-muted-foreground shadow-[inset_0_-1px_0_var(--color-border)]">
      <button
        type="button"
        onClick={() => onSort(col)}
        className={`flex items-center gap-1 py-2 hover:text-foreground ${active ? 'text-foreground' : ''}`}
      >
        {label}
        <Icon className={`h-3 w-3 ${active ? '' : 'opacity-40'}`} />
      </button>
    </th>
  );
}

type Props = {
  people: Person[];
  now: Date | null;
  onSelect: (id: string) => void;
};

export function Library({ people, now, onSelect }: Props) {
  const { t, lang } = useT();
  const [status, setStatus] = useState<Status>('living');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>({ key: 'birth', dir: 1 });
  const [limit, setLimit] = useState(PAGE);
  const living = status === 'living';
  const year = now?.getFullYear();

  const rows = useMemo(() => {
    const value = (p: Person) =>
      sort.key === 'name'
        ? p.name
        : sort.key === 'birth'
          ? p.birthYear
          : lastOf(p, living, year);

    const cmp = (a: Person, b: Person) => {
      const x = value(a);
      const y = value(b);
      if (x === y) return 0;
      if (x === undefined) return 1; // unknown values always last
      if (y === undefined) return -1;

      const r =
        typeof x === 'string' && typeof y === 'string'
          ? x.localeCompare(y, lang)
          : Number(x) - Number(y);

      return r * sort.dir;
    };

    return people
      .filter((p) => isAlive(p) === living)
      .filter((p) => filter === 'all' || p.gender === filter)
      .sort(cmp);
  }, [people, living, filter, sort, lang, year]);

  const shown = rows.slice(0, limit);
  const remaining = rows.length - shown.length;

  const pick =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setLimit(PAGE);
    };

  const onSort = (key: SortKey) =>
    setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b bg-card">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <Segmented
            value={status}
            onChange={pick(setStatus)}
            options={[
              { value: 'living', label: t('living') },
              { value: 'deceased', label: t('deceased') },
            ]}
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
          <p className="w-full text-xs text-muted-foreground">
            {shown.length} / {rows.length} {t('people')}
          </p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-3xl px-4 pb-4">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <SortHeader
                  label={t('name')}
                  col="name"
                  sort={sort}
                  onSort={onSort}
                />
                <SortHeader
                  label={t('birth')}
                  col="birth"
                  sort={sort}
                  onSort={onSort}
                />
                <SortHeader
                  label={living ? t('age') : t('diedIn')}
                  col="last"
                  sort={sort}
                  onSort={onSort}
                />
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => onSelect(p.id)}
                  style={genderVars(p.gender)}
                  className="cursor-pointer border-b transition-colors hover:bg-(--c-soft)"
                >
                  <td className={td}>
                    <span className="flex items-start gap-2">
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                        style={{ background: genderColor(p.gender) }}
                      />
                      <span>
                        {p.name}
                        {p.courtesyName && (
                          <span className="block text-xs text-muted-foreground">
                            {courtesyNameText(p)}
                          </span>
                        )}
                      </span>
                    </span>
                  </td>
                  <td className={td}>{p.birthYear ?? '?'}</td>
                  <td className={`${td} text-muted-foreground`}>
                    {lastOf(p, living, year)}
                  </td>
                </tr>
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
        </div>
      </div>
    </div>
  );
}
