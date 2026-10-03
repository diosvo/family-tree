import { useState } from 'react';

import {
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  Pencil,
  X,
} from 'lucide-react';

import { Dialog } from '@/components/ui/dialog';
import { SelectField } from '@/components/ui/select-field';
import {
  childrenOf,
  genderVars,
  isDeceased,
  lifespan,
  siblingsOf,
} from '@/lib/family-data';
import { useFamily } from '@/lib/family-store';
import { useT } from '@/lib/i18n';
import { lunarLabel, memorialOf, typedDate } from '@/lib/lunar';
import { btn, btnPrimary, cn, input } from '@/lib/utils';

import { PersonForm } from './PersonForm';
import { CourtesyName, DeceasedMark } from './PersonParts';

import type { Person } from '@/lib/family-data';
import type { Suggestion } from '@/lib/family-store';
import type { Key } from '@/lib/i18n';

const FIELDS: Array<Suggestion['field']> = [
  'name',
  'courtesyName',
  'birthDate',
  'deathDate',
  'other',
];

/** What a person has now for a suggestion field, as it would be typed. */
function currentValue(p: Person, field: Suggestion['field']) {
  switch (field) {
    case 'name':
      return p.name;
    case 'courtesyName':
      return p.courtesyName ?? '';
    case 'birthDate':
    case 'deathDate':
      return typedDate(p[field]);
    case 'other':
      return '';
  }
}

function RelList({
  label,
  people,
  onSelect,
}: { label: string; people: Person[] } & Pick<Props, 'onSelect'>) {
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
  const { people, byId, isAdmin, removePerson, addSuggestion, reportError } =
    useFamily();

  const { t, lang } = useT();
  const [field, setField] = useState<Suggestion['field']>('courtesyName');
  /** Starts as the current value of `field`, to be corrected in place. */
  const [value, setValue] = useState(() => currentValue(person, field));
  const current = currentValue(person, field);
  const unchanged = value.trim() === current;
  const [author, setAuthor] = useState('');
  /** Hidden from people; a bot that fills it is ignored by the server. */
  const [website, setWebsite] = useState('');
  const [editing, setEditing] = useState(false);

  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>(
    'idle',
  );

  /** On phones the panel starts collapsed to the header and family buttons. */
  const [expanded, setExpanded] = useState(false);

  // The panel stays mounted while another person is opened: start their
  // suggestion from what they have now.
  const [shownId, setShownId] = useState(person.id);

  if (shownId !== person.id) {
    setShownId(person.id);
    setValue(current);
    setStatus('idle');
  }

  const get = (ids: Array<string | undefined>) =>
    ids.flatMap((id) => (id && byId.get(id)) || []);

  /** Other houses reachable from this person, shown as buttons in this order. */
  const houses = [
    [person.fatherId, 'fathersFamily'],
    [person.motherId, 'mothersFamily'],
    [
      person.spouseIds[0],
      person.gender === 'male' ? 'wifesFamily' : 'husbandsFamily',
    ],
  ] as const;

  const Toggle = expanded ? ChevronDown : ChevronUp;
  const memorial = memorialOf(person.deathDate);

  return (
    <div className="space-y-3 p-4 md:space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-medium">
            <span className="truncate">
              {person.name}{' '}
              <CourtesyName person={person} className="font-normal" />
            </span>
            {isDeceased(person) && (
              <DeceasedMark className="inline-block shrink-0" />
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(person.gender)} · {lifespan(person)}
            {memorial
              ? ` · ${t('memorialShort', { d: lunarLabel(memorial.day, memorial.month, lang) })}`
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
        {houses.map(
          ([id, label]) =>
            id && (
              <button key={label} onClick={() => onHouse(id)} className={btn}>
                {t(label)}
              </button>
            ),
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
          onSubmit={async (e) => {
            e.preventDefault();
            if (!value.trim() || unchanged || status === 'sending') return;
            setStatus('sending');

            try {
              await addSuggestion({
                personId: person.id,
                field,
                value: value.trim(),
                author: author.trim() || 'Anonymous',
                website,
              });

              // The person keeps their value until the admin accepts.
              setValue(current);
              setStatus('sent');
            } catch {
              // Keep the text so the visitor can retry.
              setStatus('failed');
            }
          }}
        >
          <div className="text-sm">{t('suggest')}</div>
          <div className="flex gap-2">
            <SelectField
              className="w-40 shrink-0"
              value={field}
              onChange={(v) => {
                const next = v as Suggestion['field'];
                setField(next);
                setValue(currentValue(person, next));
                setStatus('idle');
              }}
              options={FIELDS.map((f) => ({
                value: f,
                label: t(`field_${f}` as Key),
              }))}
            />
            <input
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setStatus('idle');
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
          <input
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            className="hidden"
          />
          {status === 'failed' && (
            <p role="alert" className="text-sm text-destructive">
              {t('sendFailed')}
            </p>
          )}
          <button
            // Nothing to send until the current value is changed.
            disabled={status === 'sending' || (unchanged && status !== 'sent')}
            className={`${btn} w-full py-2 text-sm`}
          >
            {status === 'sending'
              ? t('sending')
              : status === 'sent'
                ? t('sent')
                : t('send')}
          </button>
        </form>

        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className={`${btn} flex flex-1 items-center justify-center gap-1`}
            >
              <Pencil className="h-3 w-3" /> {t('editPerson')}
            </button>
            <button
              onClick={() => {
                if (confirm(t('confirmRemove', { name: person.name }))) {
                  removePerson(person.id).then(onClose, reportError);
                }
              }}
              className={`${btn} flex-1 border-destructive text-destructive`}
            >
              {t('removePerson')}
            </button>
          </div>
        )}
        <Dialog
          open={editing}
          onOpenChange={setEditing}
          title={`${t('editPerson')}: ${person.name}`}
        >
          <PersonForm person={person} onDone={() => setEditing(false)} />
        </Dialog>
      </div>
    </div>
  );
}
