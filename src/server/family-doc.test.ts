import { describe, expect, it } from 'vitest';

import { statusOf } from '@/test/helpers';
import { person as P, marry } from '@/test/people';

import {
  MAX_PENDING,
  addPersonTo,
  addSuggestionTo,
  parseId,
  parsePerson,
  parsePersonUpdate,
  parseSuggestion,
  removePersonFrom,
  resolveSuggestionIn,
  updatePersonIn,
} from './family-doc';
import { SCHEMA_VERSION } from './store';

import type { FamilyDoc } from './store';
import type { Suggestion } from '@/lib/family-data';

const doc = (): FamilyDoc => ({
  schemaVersion: SCHEMA_VERSION,
  people: marry(
    [
      P('dad', 'male', 1950),
      P('mum', 'female', 1952),
      P('kid', 'male', 1980, { fatherId: 'dad', motherId: 'mum' }),
      P('grandkid', 'female', 2010, { fatherId: 'kid' }),
      P('other', 'female', 1982),
    ],
    ['dad', 'mum'],
  ),
  suggestions: {},
});

const byId = (d: FamilyDoc, id: string) => d.people.find((p) => p.id === id);

/** A pending suggestion about `kid`. */
const suggestion = (
  id: string,
  field: Suggestion['field'] = 'birthDate',
  value = '1/2/1981',
): Suggestion => ({
  id,
  personId: 'kid',
  field,
  value,
  author: 'Me',
  createdAt: 0,
});

describe('parsePerson', () => {
  it('trims text, normalises dates and drops duplicate spouses', () => {
    expect(
      parsePerson({
        name: '  Lan ',
        courtesyName: '',
        gender: 'female',
        birthDate: '2/10/1925',
        deathDate: '1990',
        spouseIds: ['a', 'a'],
      }),
    ).toEqual({
      name: 'Lan',
      courtesyName: undefined,
      gender: 'female',
      birthDate: '1925-10-02',
      deathDate: '1990',
      fatherId: undefined,
      motherId: undefined,
      spouseIds: ['a'],
    });
  });

  it('keeps dates already in stored form and treats null as absent', () => {
    expect(
      parsePerson({
        name: 'A',
        gender: 'male',
        birthDate: '1925-10-02',
        courtesyName: null,
      }),
    ).toMatchObject({ birthDate: '1925-10-02', courtesyName: undefined });
  });

  it.each([
    ['no name', { gender: 'male', name: ' ' }],
    ['a bad gender', { gender: 'x', name: 'A' }],
    ['a bad date', { gender: 'male', name: 'A', birthDate: 'soon' }],
    ['bad spouses', { gender: 'male', name: 'A', spouseIds: [1] }],
    ['a long name', { gender: 'male', name: 'A'.repeat(201) }],
    ['not an object', 'Lan'],
  ])('rejects %s', (_, input) => {
    expect(statusOf(() => parsePerson(input))).toBe(400);
  });
});

describe('parsePersonUpdate and parseId', () => {
  it('parses updates with their id', () => {
    expect(parsePersonUpdate({ id: 'p1', name: 'A', gender: 'male' })).toEqual(
      expect.objectContaining({ id: 'p1', name: 'A' }),
    );

    expect(parseId(' p1 ')).toBe('p1');
  });

  it.each([
    ['not an object', null],
    ['no id', { name: 'A', gender: 'male' }],
  ])('rejects %s', (_, input) => {
    expect(statusOf(() => parsePersonUpdate(input))).toBe(400);
  });
});

describe('parseSuggestion', () => {
  const valid = { personId: 'kid', field: 'name', value: 'X', author: 'Me' };

  it('accepts a valid suggestion', () => {
    expect(parseSuggestion(valid)).toEqual(valid);
  });

  it('returns null when the hidden honeypot field is filled', () => {
    expect(parseSuggestion({ ...valid, website: 'http://spam' })).toBeNull();
  });

  it.each([
    ['unknown fields', { ...valid, field: 'id' }],
    ['what is not an object', 'hi'],
  ])('rejects %s', (_, input) => {
    expect(statusOf(() => parseSuggestion(input))).toBe(400);
  });
});

describe('addPersonTo', () => {
  it('adds the person and lists them on their spouses', () => {
    const d = doc();
    addPersonTo(d, 'new', { ...P('', 'male', 1981), spouseIds: ['other'] });
    expect(byId(d, 'new')?.spouseIds).toEqual(['other']);
    expect(byId(d, 'other')?.spouseIds).toEqual(['new']);
  });

  it.each([
    ['an unknown parent', { fatherId: 'ghost' }],
    ['a mother as father', { fatherId: 'mum' }],
    ['a father as mother', { motherId: 'dad' }],
  ])('rejects %s', (_, links) => {
    expect(
      statusOf(() => addPersonTo(doc(), 'new', { ...P('', 'male'), ...links })),
    ).toBe(400);
  });
});

describe('updatePersonIn', () => {
  it('replaces the details and keeps marriages symmetric', () => {
    const d = doc();

    updatePersonIn(d, {
      ...byId(d, 'dad')!,
      name: 'Dad',
      spouseIds: ['other'],
    });

    expect(byId(d, 'dad')?.name).toBe('Dad');
    expect(byId(d, 'mum')?.spouseIds).toEqual([]);
    expect(byId(d, 'other')?.spouseIds).toEqual(['dad']);
  });

  it('updates someone with no parents', () => {
    const d = doc();
    updatePersonIn(d, { ...byId(d, 'other')!, name: 'Other' });
    expect(byId(d, 'other')?.name).toBe('Other');
  });

  it.each([
    ['a descendant as father', 'dad', { fatherId: 'kid' }],
    ['themself as father', 'dad', { fatherId: 'dad' }],
    ['a descendant as mother', 'mum', { motherId: 'grandkid' }],
  ])('rejects %s', (_, id, links) => {
    const d = doc();

    expect(
      statusOf(() => updatePersonIn(d, { ...byId(d, id)!, ...links })),
    ).toBe(400);
  });

  it('rejects someone who is not saved', () => {
    expect(statusOf(() => updatePersonIn(doc(), P('ghost', 'male')))).toBe(404);
  });
});

describe('removePersonFrom', () => {
  it('unlinks children and spouses', () => {
    const d = doc();
    removePersonFrom(d, 'dad');
    expect(byId(d, 'dad')).toBeUndefined();
    expect(byId(d, 'kid')?.fatherId).toBeUndefined();
    expect(byId(d, 'kid')?.motherId).toBe('mum');
    expect(byId(d, 'mum')?.spouseIds).toEqual([]);
  });

  it('unlinks a removed mother', () => {
    const d = doc();
    removePersonFrom(d, 'mum');

    expect(byId(d, 'kid')).toMatchObject({
      fatherId: 'dad',
      motherId: undefined,
    });
  });
});

describe('suggestions', () => {
  it('accepting a date stores it normalised', () => {
    const d = doc();
    addSuggestionTo(d, suggestion('s1'));
    resolveSuggestionIn(d, 's1', true);
    expect(byId(d, 'kid')?.birthDate).toBe('1981-02-01');
    expect(d.suggestions).toEqual({});
  });

  it('dismissing, or an unreadable date, leaves the person as is', () => {
    const d = doc();
    addSuggestionTo(d, suggestion('s1'));
    addSuggestionTo(d, suggestion('s2', 'birthDate', 'soon'));
    resolveSuggestionIn(d, 's1', false);
    resolveSuggestionIn(d, 's2', true);
    expect(byId(d, 'kid')?.birthDate).toBe('1980');
  });

  it('accepting a name changes it; notes and unknown ids change nothing', () => {
    const d = doc();
    addSuggestionTo(d, suggestion('s1', 'name', 'Kid'));
    addSuggestionTo(d, suggestion('s2', 'other', 'note'));

    resolveSuggestionIn(d, 'missing', true);
    resolveSuggestionIn(d, 's2', true);
    resolveSuggestionIn(d, 's1', true);

    expect(byId(d, 'kid')?.name).toBe('Kid');
    expect(d.suggestions).toEqual({});
  });

  it('rejects suggestions about unknown people', () => {
    expect(
      statusOf(() =>
        addSuggestionTo(doc(), { ...suggestion('s1'), personId: 'ghost' }),
      ),
    ).toBe(400);
  });

  it(`keeps at most ${MAX_PENDING} pending`, () => {
    const d = doc();

    for (let i = 0; i < MAX_PENDING; i++) {
      addSuggestionTo(d, suggestion(`s${i}`));
    }

    expect(statusOf(() => addSuggestionTo(d, suggestion('one-more')))).toBe(
      429,
    );
  });
});
