import { useMemo } from 'react';

import { ArrowLeftRight } from 'lucide-react';

import { SelectField } from '@/components/ui/select-field';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { courtesyNameText, genderVars, lifespan } from '@/lib/family-data';
import { useT } from '@/lib/i18n';
import { kinship } from '@/lib/kinship';
import { btn } from '@/lib/utils';

import type { Person } from '@/lib/family-data';

type Props = {
  people: Person[];
  pair: [string, string];
  onChange: (pair: [string, string]) => void;
  onSelect: (id: string) => void;
};

function PersonCard({
  person,
  onSelect,
}: {
  person: Person;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(person.id)}
      style={genderVars(person.gender)}
      className="w-full rounded-lg border border-(--c) bg-card px-3 py-2 text-left transition-colors hover:bg-(--c-soft)"
    >
      <div className="font-medium">
        {person.name}{' '}
        {person.courtesyName && (
          <span className="font-normal text-muted-foreground">
            {courtesyNameText(person)}
          </span>
        )}
      </div>
      <div className="text-xs text-muted-foreground">{lifespan(person)}</div>
    </button>
  );
}

/** Pick two relatives and see how they are related and address each other. */
export function KinshipView({ people, pair, onChange, onSelect }: Props) {
  const { t, lang } = useT();
  const [aId, bId] = pair;
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  const options = useMemo(
    () =>
      [...people]
        .sort((a, b) => a.name.localeCompare(b.name, lang))
        .map((p) => ({
          value: p.id,
          label: `${p.name} (${p.birthYear ?? '?'})`,
        })),
    [people, lang],
  );

  const a = byId.get(aId);
  const b = byId.get(bId);
  const kin = a && b ? kinship(people, a.id, b.id) : null;
  const first = (p: Person) => p.name.split(' ').pop() ?? p.name;

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 space-y-4 overflow-auto p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <label className="space-y-1 text-xs text-muted-foreground">
          {t('personA')}
          <SelectField
            value={aId}
            onChange={(v) => onChange([v, bId])}
            options={options}
            placeholder={t('pickPerson')}
          />
        </label>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onChange([bId, aId])}
              aria-label={t('swap')}
              className={`${btn} cursor-pointer justify-self-center p-2`}
            >
              <ArrowLeftRight className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{t('swap')}</TooltipContent>
        </Tooltip>
        <label className="space-y-1 text-xs text-muted-foreground">
          {t('personB')}
          <SelectField
            value={bId}
            onChange={(v) => onChange([aId, v])}
            options={options}
            placeholder={t('pickPerson')}
          />
        </label>
      </div>

      {a && b && (
        <div className="grid gap-3 sm:grid-cols-2">
          <PersonCard person={a} onSelect={onSelect} />
          <PersonCard person={b} onSelect={onSelect} />
        </div>
      )}

      {a && b && !kin && (
        <p className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">
          {t('noRelation')}
        </p>
      )}

      {a && b && kin && (
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <p className="text-sm">
            {t('isOf', {
              a: a.name,
              b: b.name,
              rel: lang === 'vi' ? kin.vi : `${kin.en} (${kin.vi})`,
            })}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                [a, b, kin.aCalls],
                [b, a, kin.bCalls],
              ] as const
            ).map(([x, y, term]) => (
              <div
                key={x.id}
                style={genderVars(x.gender)}
                className="rounded-md border border-(--c) px-3 py-2"
              >
                <div className="text-xs text-muted-foreground">
                  {t('calls', { a: first(x), b: first(y) })}
                </div>
                <div className="text-lg">{term}</div>
              </div>
            ))}
          </div>
          {kin.path.length > 2 && (
            <div className="text-xs text-muted-foreground">
              {t('relationPath')}:{' '}
              {kin.path.map((p, i) => (
                <span key={p.id}>
                  {i > 0 && ' → '}
                  <button
                    onClick={() => onSelect(p.id)}
                    className="underline-offset-2 hover:text-foreground hover:underline"
                  >
                    {p.name}
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">{t('regionNote')}</p>
        </div>
      )}
    </div>
  );
}
