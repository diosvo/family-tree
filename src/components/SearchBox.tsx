import { useRef } from 'react';

import { Search, X } from 'lucide-react';

import { birthYear } from '@/lib/family-data';
import { useT } from '@/lib/i18n';

import type { Person } from '@/lib/family-data';

type Props = {
  value: string;
  onChange: (q: string) => void;
  /** People matching `value`; listed in a dropdown when `dropdown` is on. */
  results: Person[];
  dropdown: boolean;
  onPick: (id: string) => void;
};

/** Most matches listed in the dropdown. */
const MAX_RESULTS = 12;

/** The search box shared by every tab; on the tree it lists matches to jump to. */
export function SearchBox({
  value,
  onChange,
  results,
  dropdown,
  onPick,
}: Props) {
  const { t } = useT();
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="relative mt-3">
      <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('search')}
        aria-label={t('search')}
        className="w-full rounded-md border bg-background py-2 pr-8 pl-8 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      {value && (
        <button
          onClick={() => {
            onChange('');
            ref.current?.focus();
          }}
          aria-label={t('clear')}
          className="absolute top-1.5 right-1.5 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {value && dropdown && (
        <div
          data-testid="search-results"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover shadow-lg"
        >
          {results.slice(0, MAX_RESULTS).map((p) => (
            <button
              key={p.id}
              onClick={() => onPick(p.id)}
              className="block w-full border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-accent"
            >
              {p.name}{' '}
              <span className="text-muted-foreground">{birthYear(p)}</span>
            </button>
          ))}
          {!results.length && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              {t('noMatch')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
