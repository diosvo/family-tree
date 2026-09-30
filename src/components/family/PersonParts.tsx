import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { courtesyNameText, yearOf } from '@/lib/family-data';
import { useT } from '@/lib/i18n';
import {
  lunarDateLabel,
  parseDate,
  solarDateLabel,
  solarToLunar,
} from '@/lib/lunar';
import { cn } from '@/lib/utils';

import type { Person } from '@/lib/family-data';
import type { Calendar } from '@/lib/lunar';

/**
 * A stored solar date as "DD/MM/YYYY" in the given calendar; a year-only
 * date shows the year, and an unknown one shows `fallback`.
 */
export function CalendarDate({
  date,
  calendar,
  fallback = '',
  className,
}: {
  date?: string | undefined;
  calendar: Calendar;
  fallback?: string;
  className?: string;
}) {
  const { lang } = useT();
  const parsed = date ? parseDate(date) : undefined;

  if (!parsed)
    return <span className={className}>{yearOf(date) ?? fallback}</span>;

  return (
    <span className={className}>
      {calendar === 'lunar'
        ? lunarDateLabel(solarToLunar(parsed), lang)
        : solarDateLabel(parsed)}
    </span>
  );
}

/** Courtesy name in parentheses, muted; renders nothing when there is none. */
export function CourtesyName({
  person,
  className,
}: {
  person: Person;
  className?: string;
}) {
  if (!person.courtesyName) return null;

  return (
    <span className={cn('text-muted-foreground', className)}>
      {courtesyNameText(person)}
    </span>
  );
}

/** Small black band marking a deceased person, with a tooltip. */
export function DeceasedMark({ className }: { className?: string }) {
  const { t } = useT();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('h-2.5 w-4 rounded-[2px] bg-black', className)} />
      </TooltipTrigger>
      <TooltipContent>{t('deceased')}</TooltipContent>
    </Tooltip>
  );
}
