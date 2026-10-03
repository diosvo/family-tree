import { describe, expect, it } from 'vitest';

import {
  lunarDateLabel,
  lunarLabel,
  lunarToSolar,
  memorialOf,
  nextMemorial,
  normalizeDate,
  parseDate,
  solarLabel,
  solarToLunar,
  toISODate,
  typedDate,
} from './lunar';

const d = (iso: string) => parseDate(iso)!;

/** The solar date `date` maps back to, through its lunar date. */
function roundTrip(date: Date) {
  const l = solarToLunar(date);

  return toISODate(lunarToSolar(l.day, l.month, l.year));
}

describe('solarToLunar', () => {
  it.each([
    // Tết (lunar new year)
    ['2023-01-22', { day: 1, month: 1, year: 2023, leap: false }],
    ['2024-02-10', { day: 1, month: 1, year: 2024, leap: false }],
    ['2025-01-29', { day: 1, month: 1, year: 2025, leap: false }],
    ['2026-02-17', { day: 1, month: 1, year: 2026, leap: false }],
    // The eve of Tết still belongs to the old lunar year.
    ['2024-02-09', { day: 30, month: 12, year: 2023, leap: false }],
    // Mid-autumn festival
    ['2024-09-17', { day: 15, month: 8, year: 2024, leap: false }],
    // Leap months: 2/2023, 6/2025
    ['2023-03-22', { day: 1, month: 2, year: 2023, leap: true }],
    ['2025-06-25', { day: 1, month: 6, year: 2025, leap: false }],
    ['2025-07-25', { day: 1, month: 6, year: 2025, leap: true }],
  ])('%s', (solar, lunar) => {
    expect(solarToLunar(d(solar))).toEqual(lunar);
  });

  it('applies the old correction to the moon before the 9th century', () => {
    const l = solarToLunar(new Date(700, 0, 15));
    expect(l.day).toBeGreaterThanOrEqual(1);
    expect(l.day).toBeLessThanOrEqual(30);
  });
});

describe('lunarToSolar', () => {
  it('finds Tết and the mid-autumn festival', () => {
    expect(toISODate(lunarToSolar(1, 1, 2024))).toBe('2024-02-10');
    expect(toISODate(lunarToSolar(15, 8, 2024))).toBe('2024-09-17');
  });

  it('uses the regular month, not the leap one', () => {
    expect(toISODate(lunarToSolar(1, 6, 2025))).toBe('2025-06-25');
  });

  it('round-trips every non-leap day from 1900 to 2050 (sampled)', () => {
    for (
      let t = Date.UTC(1900, 0, 1);
      t < Date.UTC(2050, 0, 1);
      t += 7 * 864e5
    ) {
      const u = new Date(t);

      const date = new Date(
        u.getUTCFullYear(),
        u.getUTCMonth(),
        u.getUTCDate(),
      );

      if (solarToLunar(date).leap) continue;
      expect(roundTrip(date)).toBe(toISODate(date));
    }
  });

  it('converts dates before the Gregorian calendar (1582)', () => {
    expect(roundTrip(new Date(1500, 5, 1))).toBe('1500-06-01');
  });
});

describe('nextMemorial', () => {
  it('counts the days to the next anniversary', () => {
    const { days, date } = nextMemorial(15, 8, d('2024-09-10'));
    expect(days).toBe(7);
    expect(toISODate(date)).toBe('2024-09-17');
  });

  it('is 0 on the day itself, whatever the time', () => {
    const now = d('2024-09-17');
    now.setHours(22, 30);
    expect(nextMemorial(15, 8, now).days).toBe(0);
  });

  it('moves to next year once this year’s has passed', () => {
    const { date } = nextMemorial(15, 8, d('2024-09-18'));
    expect(toISODate(date)).toBe('2025-10-06');
  });
});

describe('memorialOf', () => {
  it('gives the lunar day and month of a full date of death', () => {
    expect(memorialOf('2024-09-17')).toEqual({ day: 15, month: 8 });
  });

  it('is undefined when only the year is known', () => {
    expect(memorialOf('1970')).toBeUndefined();
    expect(memorialOf(undefined)).toBeUndefined();
  });
});

describe('parseDate and normalizeDate', () => {
  it('reads ISO, day-month-year and slashes', () => {
    expect(toISODate(d('1925-10-02'))).toBe('1925-10-02');
    expect(toISODate(d('2/10/1925'))).toBe('1925-10-02');
    expect(toISODate(d('02-10-1925'))).toBe('1925-10-02');
  });

  it('rejects days that do not exist', () => {
    expect(parseDate('2023-02-29')).toBeUndefined();
    expect(parseDate('31/04/2020')).toBeUndefined();
    expect(parseDate('29/02/2024')).toBeDefined();
  });

  it('normalises to the stored form, keeping bare years', () => {
    expect(normalizeDate('12/03/1900')).toBe('1900-03-12');
    expect(normalizeDate(' 1990 ')).toBe('1990');
    expect(normalizeDate('March 1990')).toBeUndefined();
    expect(normalizeDate('')).toBeUndefined();
  });
});

describe('labels', () => {
  it('formats day-month in Vietnamese and a short month in English', () => {
    expect(lunarLabel(5, 8, 'vi')).toBe('05-08');
    expect(lunarLabel(5, 8, 'en')).toBe('5 Aug');
    expect(solarLabel(d('2024-11-20'), 'vi')).toBe('20-11');
    expect(solarLabel(d('2024-11-20'), 'en')).toBe('20 Nov');
  });

  it('marks leap months only', () => {
    const leap = { day: 1, month: 2, year: 2023, leap: true };
    expect(lunarDateLabel(leap, 'vi')).toBe('01/02/2023 (nhuận)');
    expect(lunarDateLabel(leap, 'en')).toBe('01/02/2023 (leap)');

    const regular = { day: 15, month: 8, year: 2024, leap: false };
    expect(lunarDateLabel(regular, 'vi')).toBe('15/08/2024');
  });
});

describe('typedDate', () => {
  it('shows stored dates the way they are typed', () => {
    expect(typedDate('1925-10-02')).toBe('02/10/1925');
    expect(typedDate('1925')).toBe('1925');
    expect(typedDate(undefined)).toBe('');
  });
});
