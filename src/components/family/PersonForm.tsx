import { useMemo, useState } from 'react';

import { X } from 'lucide-react';

import { SelectField } from '@/components/ui/select-field';
import { birthYear, descendantsOf, genderVars } from '@/lib/family-data';
import { useFamily } from '@/lib/family-store';
import { useT } from '@/lib/i18n';
import { normalizeDate, typedDate } from '@/lib/lunar';
import { btnPrimary, input } from '@/lib/utils';

import type { Gender, Person } from '@/lib/family-data';

type FormState = Required<Omit<Person, 'id'>>;

/** Adds a person, or edits `person` when given. */
export function PersonForm({
  person,
  onDone,
}: {
  person?: Person;
  onDone: () => void;
}) {
  const { people, byId, addPerson, updatePerson } = useFamily();
  const { t } = useT();
  const [status, setStatus] = useState<'idle' | 'saving' | 'failed'>('idle');
  const [failure, setFailure] = useState('');

  const [f, setF] = useState<FormState>({
    name: person?.name ?? '',
    courtesyName: person?.courtesyName ?? '',
    gender: person?.gender ?? 'male',
    birthDate: typedDate(person?.birthDate),
    deathDate: typedDate(person?.deathDate),
    fatherId: person?.fatherId ?? '',
    motherId: person?.motherId ?? '',
    spouseIds: person?.spouseIds ?? [],
  });

  const set =
    <TKey extends keyof FormState>(k: TKey) =>
    (v: FormState[TKey]) =>
      setF((prev) => ({ ...prev, [k]: v }));

  const text = (
    k: 'name' | 'courtesyName' | 'birthDate' | 'deathDate',
    placeholder: string,
  ) => (
    <input
      className={input}
      placeholder={placeholder}
      aria-label={placeholder}
      value={f[k]}
      onChange={(e) => set(k)(e.target.value)}
    />
  );

  /** Nobody can be their own parent or ancestor. */
  const notParents = useMemo(
    () =>
      person
        ? new Set([person.id, ...descendantsOf(people, person.id)])
        : new Set<string>(),
    [people, person],
  );

  const opts = (keep: (p: Person) => boolean) =>
    people.filter(keep).map((p) => ({
      value: p.id,
      label: `${p.name} (${birthYear(p) ?? '?'})`,
    }));

  const parentOpts = (g: Gender) =>
    opts((p) => p.gender === g && !notParents.has(p.id));

  const spouseOpts = opts(
    (p) => p.id !== person?.id && !f.spouseIds.includes(p.id),
  );

  return (
    <form
      className="grid gap-2 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!f.name.trim() || status === 'saving') return;
        setStatus('saving');

        const data = {
          name: f.name.trim(),
          courtesyName: f.courtesyName.trim() || undefined,
          gender: f.gender,
          birthDate: normalizeDate(f.birthDate),
          deathDate: normalizeDate(f.deathDate),
          fatherId: f.fatherId || undefined,
          motherId: f.motherId || undefined,
          spouseIds: f.spouseIds,
        };

        try {
          if (person) await updatePerson({ ...data, id: person.id });
          else await addPerson(data);
          onDone();
        } catch (error) {
          // Stay open with what was typed, so it can be fixed and resent.
          setFailure(error instanceof Error ? error.message : '');
          setStatus('failed');
        }
      }}
    >
      {text('name', t('fullName'))}
      {text('courtesyName', t('courtesyName'))}
      <SelectField
        value={f.gender}
        onChange={(v) => set('gender')(v as Gender)}
        options={[
          { value: 'male', label: t('male') },
          { value: 'female', label: t('female') },
        ]}
      />
      {text('birthDate', t('birthDate'))}
      {text('deathDate', t('deathDate'))}
      <SelectField
        value={f.fatherId}
        onChange={set('fatherId')}
        emptyLabel={`${t('father')} ${t('none')}`}
        options={parentOpts('male')}
      />
      <SelectField
        value={f.motherId}
        onChange={set('motherId')}
        emptyLabel={`${t('mother')} ${t('none')}`}
        options={parentOpts('female')}
      />
      <div className="space-y-2 sm:col-span-2">
        {f.spouseIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {f.spouseIds.map((id) => {
              const s = byId.get(id);

              return (
                <span
                  key={id}
                  style={s && genderVars(s.gender)}
                  className="flex items-center gap-1 rounded-full border border-(--c) py-0.5 pr-1 pl-2.5 text-xs"
                >
                  {s?.name ?? id}
                  <button
                    type="button"
                    onClick={() =>
                      set('spouseIds')(f.spouseIds.filter((x) => x !== id))
                    }
                    aria-label={t('removeSpouse', { name: s?.name ?? id })}
                    className="rounded-full p-0.5 hover:bg-accent"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
        <SelectField
          value=""
          onChange={(id) => id && set('spouseIds')([...f.spouseIds, id])}
          emptyLabel={
            f.spouseIds.length ? t('addSpouse') : `${t('spouse')} ${t('none')}`
          }
          options={spouseOpts}
        />
      </div>
      {status === 'failed' && (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          {t('saveFailed')}
          {failure && `: ${failure}`}
        </p>
      )}
      <button
        disabled={status === 'saving'}
        className={`${btnPrimary} py-2 text-sm sm:col-span-2`}
      >
        {status === 'saving'
          ? t('saving')
          : person
            ? t('save')
            : t('addPerson')}
      </button>
    </form>
  );
}
