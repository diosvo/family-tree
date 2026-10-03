import { useState } from 'react';

import { Download, Inbox } from 'lucide-react';

import { EmptyState } from '@/components/EmptyState';
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
  const { byId, suggestions, resolveSuggestion, reportError, exportFamily } =
    useFamily();

  const { t } = useT();
  /** Suggestions with an accept/dismiss request in flight. */
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const groups = new Map<string, Suggestion[]>();

  const resolve = async (id: string, accept: boolean) => {
    if (pending.has(id)) return;
    setPending((p) => new Set(p).add(id));

    try {
      await resolveSuggestion(id, accept);
    } catch (error) {
      reportError(error);
    } finally {
      setPending((p) => {
        const next = new Set(p);
        next.delete(id);

        return next;
      });
    }
  };

  suggestions.forEach((s) =>
    groups.set(s.personId, [...(groups.get(s.personId) ?? []), s]),
  );

  /** Save the whole stored document as a file, as a backup. */
  const download = async () => {
    try {
      const doc = await exportFamily();

      const blob = new Blob([JSON.stringify(doc, null, 2)], {
        type: 'application/json',
      });

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `family-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (error) {
      reportError(error);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 space-y-4 overflow-auto p-4">
      <div className="flex justify-end">
        <button
          onClick={() => void download()}
          className={`${btn} flex items-center gap-1`}
        >
          <Download className="h-3.5 w-3.5" /> {t('downloadData')}
        </button>
      </div>
      {!suggestions.length && (
        <EmptyState
          icon={Inbox}
          title={t('noSuggestions')}
          description={t('noSuggestionsHint')}
        />
      )}
      {[...groups].map(([personId, list]) => (
        <section key={personId} className="rounded-lg border bg-card">
          <button
            onClick={() => onSelect(personId)}
            className="w-full rounded-t-lg border-b px-3 py-2 text-left text-sm font-medium hover:bg-accent"
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
                onClick={() => void resolve(s.id, true)}
                disabled={pending.has(s.id)}
                className={btnPrimary}
              >
                {t('accept')}
              </button>
              <button
                onClick={() => void resolve(s.id, false)}
                disabled={pending.has(s.id)}
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
