import { useState } from 'react';

import { ArrowLeftRight, ChevronDown, ChevronUp, X } from 'lucide-react';

import { SelectField } from '@/components/ui/select-field';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  childrenOf,
  courtesyNameText,
  genderVars,
  lifespan,
  siblingsOf,
} from '@/lib/family-data';
import { useFamily } from '@/lib/family-store';
import { useT } from '@/lib/i18n';
import { lunarLabel, parseMemorial } from '@/lib/lunar';
import { btn, btnPrimary, cn, input } from '@/lib/utils';

import type { Person } from '@/lib/family-data';
import type { Suggestion } from '@/lib/family-store';
import type { Key } from '@/lib/i18n';

const FIELDS: Array<Suggestion['field']> = [
  'name',
  'courtesyName',
  'birthYear',
  'memorial',
  'other',
];

function RelList({
  label,
  people,
  onSelect,
}: {
  label: string;
  people: Person[];
  onSelect: (id: string) => void;
}) {
  if (!people.length) return null;

  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {people.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            style={genderVars(p.gender)}
            className="rounded-full border border-(--c) bg-card px-2.5 py-1 text-xs transition-colors hover:bg-(--c-soft)"
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}

type Props = {
  person: Person;
  onClose: () => void;
  onSelect: (id: string) => void;
  /** Show the house (họ) of the given person in the tree. */
  onHouse: (id: string) => void;
  /** Open the kinship view with this person as the first party. */
  onCompare: (id: string) => void;
};

export function PersonPanel({
  person,
  onClose,
  onSelect,
  onHouse,
  onCompare,
}: Props) {
  const { people, byId, isAdmin, removePerson, addSuggestion } = useFamily();
  const { t, lang } = useT();
  const [field, setField] = useState<Suggestion['field']>('courtesyName');
  const [value, setValue] = useState('');
  const [author, setAuthor] = useState('');
  const [sent, setSent] = useState(false);
  /** On phones the panel starts collapsed to the header and family buttons. */
  const [expanded, setExpanded] = useState(false);

  const get = (ids: Array<string | undefined>) =>
    ids.flatMap((id) => (id && byId.get(id)) || []);

  const spouse = person.spouseIds[0];

  const memorialText = (m: string) => {
    const { day, month } = parseMemorial(m);

    return lunarLabel(day, month, lang);
  };

  const Toggle = expanded ? ChevronDown : ChevronUp;

  return (
    <div className="space-y-3 p-4 md:space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-medium">
            <span className="truncate">
              {person.name}{' '}
              {person.courtesyName && (
                <span className="font-normal text-muted-foreground">
                  {courtesyNameText(person)}
                </span>
              )}
            </span>
            {person.deathYear && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block h-2.5 w-4 shrink-0 rounded-[2px] bg-black" />
                </TooltipTrigger>
                <TooltipContent>{t('deceased')}</TooltipContent>
              </Tooltip>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(person.gender)} · {lifespan(person)}
            {person.memorial
              ? ` · ${t('memorialShort', { d: memorialText(person.memorial) })}`
              : ''}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? t('less') : t('more')}
            className="rounded-md border p-1 hover:bg-accent md:hidden"
          >
            <Toggle className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            aria-label={t('close')}
            className="rounded-md border p-1 hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => onHouse(person.id)} className={btnPrimary}>
          {t('focusFamily')}
        </button>
        {person.fatherId && (
          <button onClick={() => onHouse(person.fatherId!)} className={btn}>
            {t('fathersFamily')}
          </button>
        )}
        {person.motherId && (
          <button onClick={() => onHouse(person.motherId!)} className={btn}>
            {t('mothersFamily')}
          </button>
        )}
        {spouse && (
          <button onClick={() => onHouse(spouse)} className={btn}>
            {t(person.gender === 'male' ? 'wifesFamily' : 'husbandsFamily')}
          </button>
        )}
        <button
          onClick={() => onCompare(person.id)}
          className={`${btn} flex items-center gap-1`}
        >
          <ArrowLeftRight className="h-3 w-3" /> {t('kinshipWith')}
        </button>
      </div>

      <div className={cn('space-y-4', !expanded && 'hidden md:block')}>
        <div className="space-y-3">
          <RelList
            label={t('parents')}
            people={get([person.fatherId, person.motherId])}
            onSelect={onSelect}
          />
          <RelList
            label={t('spouse')}
            people={get(person.spouseIds)}
            onSelect={onSelect}
          />
          <RelList
            label={t('siblings')}
            people={siblingsOf(people, person)}
            onSelect={onSelect}
          />
          <RelList
            label={t('children')}
            people={childrenOf(people, person.id)}
            onSelect={onSelect}
          />
        </div>

        <form
          className="space-y-2 rounded-lg border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!value.trim()) return;

            addSuggestion({
              personId: person.id,
              field,
              value: value.trim(),
              author: author.trim() || 'Anonymous',
            });

            setValue('');
            setSent(true);
          }}
        >
          <div className="text-sm">{t('suggest')}</div>
          <div className="flex gap-2">
            <SelectField
              className="w-40 shrink-0"
              value={field}
              onChange={(v) => setField(v as Suggestion['field'])}
              options={FIELDS.map((f) => ({
                value: f,
                label: t(`field_${f}` as Key),
              }))}
            />
            <input
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setSent(false);
              }}
              placeholder={t('newInfo')}
              className={`${input} min-w-0 flex-1`}
            />
          </div>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder={t('yourName')}
            className={input}
          />
          <button className={`${btn} w-full py-2 text-sm`}>
            {sent ? t('sent') : t('send')}
          </button>
        </form>

        {isAdmin && (
          <button
            onClick={() => {
              if (confirm(t('confirmRemove', { name: person.name }))) {
                removePerson(person.id);
                onClose();
              }
            }}
            className={`${btn} w-full border-destructive text-destructive`}
          >
            {t('removePerson')}
          </button>
        )}
      </div>
    </div>
  );
}
