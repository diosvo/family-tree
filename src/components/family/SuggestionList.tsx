import { useFamily } from '@/lib/family-store';
import { useT } from '@/lib/i18n';
import { btn, btnPrimary } from '@/lib/utils';

import type { Suggestion } from '@/lib/family-store';
import type { Key } from '@/lib/i18n';

/** Admin view: pending suggestions grouped by the person they concern. */
export function SuggestionList({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const { byId, suggestions, resolveSuggestion } = useFamily();
  const { t } = useT();
  const groups = new Map<string, Suggestion[]>();

  suggestions.forEach((s) =>
    groups.set(s.personId, [...(groups.get(s.personId) ?? []), s]),
  );

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 space-y-4 overflow-auto p-4">
      {!suggestions.length && (
        <p className="text-sm text-muted-foreground">{t('noSuggestions')}</p>
      )}
      {[...groups].map(([personId, list]) => (
        <section key={personId} className="rounded-lg border bg-card">
          <button
            onClick={() => onSelect(personId)}
            className="w-full border-b px-3 py-2 text-left text-sm font-medium hover:bg-accent"
          >
            {byId.get(personId)?.name ?? t('removed')}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {list.length}
            </span>
          </button>
          {list.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center gap-2 border-b px-3 py-2 last:border-b-0"
            >
              <div className="min-w-0 flex-1 text-sm">
                <span className="text-muted-foreground">
                  {t(`field_${s.field}` as Key)}:
                </span>{' '}
                {s.value}
                <span className="ml-2 text-xs text-muted-foreground">
                  {t('by')} {s.author}
                </span>
              </div>
              <button
                onClick={() => resolveSuggestion(s.id, true)}
                className={btnPrimary}
              >
                {t('accept')}
              </button>
              <button
                onClick={() => resolveSuggestion(s.id, false)}
                className={btn}
              >
                {t('dismiss')}
              </button>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
