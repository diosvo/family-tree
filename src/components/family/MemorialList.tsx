import { CalendarOff, SearchX } from 'lucide-react';

import { EmptyState } from '@/components/EmptyState';
import { deathYear } from '@/lib/family-data';
import { useT } from '@/lib/i18n';
import {
  lunarLabel,
  memorialOf,
  nextMemorial,
  solarLabel,
  solarToLunar,
} from '@/lib/lunar';

import { PersonRow, TablePage, td, th } from './PersonTable';

import type { Person } from '@/lib/family-data';

/** Anniversaries this close are highlighted. */
const SOON = 30;

type Props = {
  people: Person[];
  /** `people` is narrowed by the search box. */
  searching: boolean;
  now: Date | null;
  onSelect: (id: string) => void;
};

export function MemorialList({ people, searching, now, onSelect }: Props) {
  const { t, lang } = useT();

  const upcoming = now
    ? people
        .flatMap((p) => {
          const m = memorialOf(p.deathDate);

          return m ? [{ p, ...m, ...nextMemorial(m.day, m.month, now) }] : [];
        })
        .sort((a, b) => a.days - b.days)
    : [];

  const todayLunar = now && solarToLunar(now);

  return (
    <TablePage
      toolbarClassName="items-baseline"
      toolbar={
        <>
          <p className="text-sm">{t('upcoming')}</p>
          {todayLunar && (
            <p className="text-xs text-muted-foreground">
              {t('todayLunar', {
                d: lunarLabel(todayLunar.day, todayLunar.month, lang),
              })}
            </p>
          )}
        </>
      }
    >
      {now &&
        !upcoming.length &&
        (searching ? (
          <EmptyState
            icon={SearchX}
            title={t('noMatch')}
            description={t('noFilterMatch')}
          />
        ) : (
          <EmptyState
            icon={CalendarOff}
            title={t('noMemorials')}
            description={t('noMemorialsHint')}
          />
        ))}
      {upcoming.length > 0 && (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={`${th} py-2`}>{t('name')}</th>
              <th className={`${th} py-2 whitespace-nowrap`}>{t('lunar')}</th>
              <th className={`${th} py-2 whitespace-nowrap`}>{t('solar')}</th>
              <th className={`${th} hidden py-2 sm:table-cell`}>
                {t('diedIn')}
              </th>
              <th className={`${th} py-2 text-right`}>{t('daysLeft')}</th>
            </tr>
          </thead>
          <tbody>
            {upcoming.map(({ p, day, month, days, date }) => (
              <PersonRow key={p.id} person={p} onSelect={onSelect}>
                <td className={`${td} whitespace-nowrap`}>
                  {lunarLabel(day, month, lang)}
                </td>
                <td className={`${td} whitespace-nowrap`}>
                  {solarLabel(date, lang)}
                </td>
                <td
                  className={`${td} hidden text-muted-foreground sm:table-cell`}
                >
                  {deathYear(p) ?? ''}
                </td>
                <td
                  className={`${td} text-right whitespace-nowrap ${days <= SOON ? 'font-medium text-(--c)' : 'text-muted-foreground'}`}
                >
                  {days === 0 ? t('today') : `${days} ${t('days')}`}
                </td>
              </PersonRow>
            ))}
          </tbody>
        </table>
      )}
    </TablePage>
  );
}
