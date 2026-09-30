import { courtesyNameText, genderColor, genderVars } from '@/lib/family-data';
import { useT } from '@/lib/i18n';
import {
  lunarLabel,
  nextMemorial,
  parseMemorial,
  solarLabel,
  solarToLunar,
} from '@/lib/lunar';

import type { Person } from '@/lib/family-data';

const th =
  'sticky top-0 bg-background py-2 pr-3 text-left text-xs font-normal text-muted-foreground shadow-[inset_0_-1px_0_var(--color-border)]';

const td = 'py-2 pr-3 align-top';
/** Anniversaries this close are highlighted. */
const SOON = 30;

type Props = {
  people: Person[];
  now: Date | null;
  onSelect: (id: string) => void;
};

export function MemorialList({ people, now, onSelect }: Props) {
  const { t, lang } = useT();

  const upcoming = now
    ? people
        .filter((p) => p.memorial)
        .map((p) => ({ p, ...nextMemorial(p.memorial!, now) }))
        .sort((a, b) => a.days - b.days)
    : [];

  const todayLunar = now && solarToLunar(now);

  const lunar = (m: string) => {
    const { day, month } = parseMemorial(m);

    return lunarLabel(day, month, lang);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b bg-card">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-baseline justify-between gap-2 px-4 py-3">
          <p className="text-sm">{t('upcoming')}</p>
          {todayLunar && (
            <p className="text-xs text-muted-foreground">
              {t('todayLunar', {
                d: lunarLabel(todayLunar.day, todayLunar.month, lang),
              })}
            </p>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-3xl px-4 pb-4">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={th}>{t('name')}</th>
                <th className={`${th} whitespace-nowrap`}>{t('lunar')}</th>
                <th className={`${th} whitespace-nowrap`}>{t('solar')}</th>
                <th className={`${th} hidden sm:table-cell`}>{t('diedIn')}</th>
                <th className={`${th} text-right`}>{t('daysLeft')}</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map(({ p, days, date }) => (
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
                  <td className={`${td} whitespace-nowrap`}>
                    {lunar(p.memorial!)}
                  </td>
                  <td className={`${td} whitespace-nowrap`}>
                    {solarLabel(date, lang)}
                  </td>
                  <td
                    className={`${td} hidden text-muted-foreground sm:table-cell`}
                  >
                    {p.deathYear ?? ''}
                  </td>
                  <td
                    className={`${td} text-right whitespace-nowrap ${days <= SOON ? 'font-medium text-(--c)' : 'text-muted-foreground'}`}
                  >
                    {days === 0 ? t('today') : `${days} ${t('days')}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
