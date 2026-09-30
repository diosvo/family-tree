import type { ReactNode } from 'react';

import type { Person } from '@/lib/family-data';
import { genderVars } from '@/lib/family-data';
import { cn } from '@/lib/utils';

import { CourtesyName } from './PersonParts';

/** Sticky header cell; add `py-2` unless the cell has its own padded content. */
export const th =
  'sticky top-0 bg-background pr-3 text-left text-xs font-normal text-muted-foreground shadow-[inset_0_-1px_0_var(--color-border)]';

export const td = 'py-2 pr-3 align-top';

/** Full-height view: a fixed toolbar above a scrolling table. */
export function TablePage({
  toolbar,
  toolbarClassName,
  children,
}: {
  toolbar: ReactNode;
  toolbarClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b bg-card">
        <div
          className={cn(
            'mx-auto flex w-full max-w-3xl flex-wrap justify-between gap-2 px-4 py-3',
            toolbarClassName,
          )}
        >
          {toolbar}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-3xl px-4 pb-4">{children}</div>
      </div>
    </div>
  );
}

/** Clickable row tinted by gender; the first cell is the person's name. */
export function PersonRow({
  person,
  onSelect,
  children,
}: {
  person: Person;
  onSelect: (id: string) => void;
  children: ReactNode;
}) {
  return (
    <tr
      onClick={() => onSelect(person.id)}
      style={genderVars(person.gender)}
      className="cursor-pointer border-b transition-colors hover:bg-(--c-soft)"
    >
      <td className={td}>
        <span className="flex items-start gap-2">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-(--c)" />
          <span>
            {person.name}
            <CourtesyName person={person} className="block text-xs" />
          </span>
        </span>
      </td>
      {children}
    </tr>
  );
}
