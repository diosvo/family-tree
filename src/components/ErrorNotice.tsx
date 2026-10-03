import { X } from 'lucide-react';

import { useFamily } from '@/lib/family-store';
import { useT } from '@/lib/i18n';

/** The last failed write, floating above the page until dismissed. */
export function ErrorNotice() {
  const { error, dismissError } = useFamily();
  const { t } = useT();

  if (error === undefined) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-3 bottom-3 z-30 mx-auto flex max-w-md items-start gap-2 rounded-lg border border-destructive bg-card p-3 text-sm shadow-lg"
    >
      <p className="min-w-0 flex-1">
        <span className="font-medium text-destructive">{t('saveFailed')}</span>
        {error && <span className="text-muted-foreground">: {error}</span>}
      </p>
      <button
        onClick={dismissError}
        aria-label={t('close')}
        className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
