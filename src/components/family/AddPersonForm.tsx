import { useState } from 'react';

import { SelectField } from '@/components/ui/select-field';
import { useFamily } from '@/lib/family-store';
import { useT } from '@/lib/i18n';
import { btnPrimary, input } from '@/lib/utils';

import type { Gender } from '@/lib/family-data';

export function AddPersonForm({ onDone }: { onDone: () => void }) {
  const { people, addPerson } = useFamily();
  const { t } = useT();

  const [f, setF] = useState({
    name: '',
    courtesyName: '',
    gender: 'male' as Gender,
    birthYear: '',
    deathYear: '',
    memorial: '',
    fatherId: '',
    motherId: '',
    spouseId: '',
  });

  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });

  const text = (k: keyof typeof f, placeholder: string, numeric = false) => (
    <input
      className={input}
      placeholder={placeholder}
      inputMode={numeric ? 'numeric' : undefined}
      value={f[k]}
      onChange={(e) => set(k)(e.target.value)}
    />
  );

  const opts = (g?: Gender) =>
    people
      .filter((p) => !g || p.gender === g)
      .map((p) => ({
        value: p.id,
        label: `${p.name} (${p.birthYear ?? '?'})`,
      }));

  return (
    <form
      className="grid gap-2 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!f.name.trim()) return;

        addPerson({
          name: f.name.trim(),
          courtesyName: f.courtesyName || undefined,
          gender: f.gender,
          birthYear: Number(f.birthYear) || undefined,
          deathYear: Number(f.deathYear) || undefined,
          memorial: f.memorial || undefined,
          fatherId: f.fatherId || undefined,
          motherId: f.motherId || undefined,
          spouseIds: f.spouseId ? [f.spouseId] : [],
        });

        onDone();
      }}
    >
      {text('name', t('fullName'))}
      {text('courtesyName', t('courtesyName'))}
      <SelectField
        value={f.gender}
        onChange={set('gender')}
        options={[
          { value: 'male', label: t('male') },
          { value: 'female', label: t('female') },
        ]}
      />
      {text('birthYear', t('birthYear'), true)}
      {text('deathYear', t('deathYear'), true)}
      {text('memorial', t('memorialDate'))}
      <SelectField
        value={f.fatherId}
        onChange={set('fatherId')}
        emptyLabel={`${t('father')} ${t('none')}`}
        options={opts('male')}
      />
      <SelectField
        value={f.motherId}
        onChange={set('motherId')}
        emptyLabel={`${t('mother')} ${t('none')}`}
        options={opts('female')}
      />
      <SelectField
        className="sm:col-span-2"
        value={f.spouseId}
        onChange={set('spouseId')}
        emptyLabel={`${t('spouse')} ${t('none')}`}
        options={opts()}
      />
      <button className={`${btnPrimary} py-2 text-sm sm:col-span-2`}>
        {t('addPerson')}
      </button>
    </form>
  );
}
