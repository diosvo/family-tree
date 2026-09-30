import { X } from 'lucide-react';

import { useT } from '@/lib/i18n';
import { kinship } from '@/lib/kinship';
import { btn, btnPrimary } from '@/lib/utils';

import type { Person } from '@/lib/family-data';

type Props = {
  people: Person[];
  pair: [string, string];
  onClear: () => void;
  onClose: () => void;
  onDetails: () => void;
};

/** Floating bar over the tree while picking two people to compare. */
export function CompareBar({
  people,
  pair,
  onClear,
  onClose,
  onDetails,
}: Props) {
  const { t, lang } = useT();
  const [a, b] = pair.map((id) => people.find((p) => p.id === id));
  const kin = a && b ? kinship(people, a.id, b.id) : null;
  const first = (p: Person) => p.name.split(' ').pop() ?? p.name;

  const slot = (n: number, p?: Person) => (
    <span className="flex items-center gap-1.5">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">
        {n}
      </span>
      <span className={p ? '' : 'text-muted-foreground'}>{p?.name ?? '…'}</span>
    </span>
  );

  return (
    <div className="absolute top-3 left-3 z-10 max-w-[calc(100%-1.5rem)] space-y-2 rounded-lg border bg-card p-3 text-sm shadow-sm md:max-w-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          {slot(1, a)}
          {slot(2, b)}
        </div>
        <button
          onClick={onClose}
          aria-label={t('close')}
          className="rounded-md border p-1 hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {!a || !b ? (
        <p className="text-xs text-muted-foreground">{t('compareHint')}</p>
      ) : kin ? (
        <div className="space-y-1 border-t pt-2">
          <p>
            {t('isOf', {
              a: first(a),
              b: first(b),
              rel: lang === 'vi' ? kin.vi : `${kin.en} (${kin.vi})`,
            })}
          </p>
          <p className="text-xs text-muted-foreground">
            {first(a)} → {first(b)}:{' '}
            <b className="font-medium text-foreground">{kin.aCalls}</b>
            {' · '}
            {first(b)} → {first(a)}:{' '}
            <b className="font-medium text-foreground">{kin.bCalls}</b>
          </p>
        </div>
      ) : (
        <p className="border-t pt-2 text-xs text-muted-foreground">
          {t('noRelation')}
        </p>
      )}
      {a && b && (
        <div className="flex gap-2">
          <button onClick={onDetails} className={btnPrimary}>
            {t('details')}
          </button>
          <button onClick={onClear} className={btn}>
            {t('clear')}
          </button>
        </div>
      )}
    </div>
  );
}
