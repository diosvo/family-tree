import type { Lang } from './i18n';

const TZ = 7;
const { PI, floor, sin } = Math;

function jdFromDate(dd: number, mm: number, yy: number) {
  const a = floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;

  let jd =
    dd +
    floor((153 * m + 2) / 5) +
    365 * y +
    floor(y / 4) -
    floor(y / 100) +
    floor(y / 400) -
    32045;

  if (jd < 2299161)
    jd = dd + floor((153 * m + 2) / 5) + 365 * y + floor(y / 4) - 32083;

  return jd;
}

function jdToDate(jd: number): [number, number, number] {
  let b = 0;
  let c = jd + 32082;

  if (jd > 2299160) {
    const a = jd + 32044;
    b = floor((4 * a + 3) / 146097);
    c = a - floor((b * 146097) / 4);
  }

  const d = floor((4 * c + 3) / 1461);
  const e = c - floor((1461 * d) / 4);
  const m = floor((5 * e + 2) / 153);

  return [
    e - floor((153 * m + 2) / 5) + 1,
    m + 3 - 12 * floor(m / 10),
    b * 100 + d - 4800 + floor(m / 10),
  ];
}

function newMoon(k: number) {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = PI / 180;
  let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  jd1 += 0.00033 * sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let c1 = (0.1734 - 0.000393 * T) * sin(M * dr) + 0.0021 * sin(2 * dr * M);
  c1 += -0.4068 * sin(Mpr * dr) + 0.0161 * sin(dr * 2 * Mpr);
  c1 += -0.0004 * sin(dr * 3 * Mpr);
  c1 += 0.0104 * sin(dr * 2 * F) - 0.0051 * sin(dr * (M + Mpr));
  c1 += -0.0074 * sin(dr * (M - Mpr)) + 0.0004 * sin(dr * (2 * F + M));
  c1 += -0.0004 * sin(dr * (2 * F - M)) - 0.0006 * sin(dr * (2 * F + Mpr));
  c1 += 0.001 * sin(dr * (2 * F - Mpr)) + 0.0005 * sin(dr * (2 * Mpr + M));

  const deltat =
    T < -11
      ? 0.001 +
        0.000839 * T +
        0.0002261 * T2 -
        0.00000845 * T3 -
        0.000000081 * T * T3
      : -0.000278 + 0.000265 * T + 0.000262 * T2;

  return jd1 + c1 - deltat;
}

function sunLongitude(jdn: number) {
  const T = (jdn - 2451545.0) / 36525;
  const T2 = T * T;
  const dr = PI / 180;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * sin(dr * M);
  DL += (0.019993 - 0.000101 * T) * sin(dr * 2 * M) + 0.00029 * sin(dr * 3 * M);
  const L = (L0 + DL) * dr;

  return L - PI * 2 * floor(L / (PI * 2));
}

const getSunLongitude = (day: number) =>
  floor((sunLongitude(day - 0.5 - TZ / 24) / PI) * 6);

const getNewMoonDay = (k: number) => floor(newMoon(k) + 0.5 + TZ / 24);

function getLunarMonth11(yy: number) {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = floor(off / 29.530588853);
  let nm = getNewMoonDay(k);
  if (getSunLongitude(nm) >= 9) nm = getNewMoonDay(k - 1);

  return nm;
}

function getLeapMonthOffset(a11: number) {
  const k = floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last = 0;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i));

  do {
    last = arc;
    i++;
    arc = getSunLongitude(getNewMoonDay(k + i));
  } while (arc !== last && i < 14);

  return i - 1;
}

export type LunarDate = {
  day: number;
  month: number;
  year: number;
  leap: boolean;
};

export function solarToLunar(date: Date): LunarDate {
  const dd = date.getDate();
  const mm = date.getMonth() + 1;
  const yy = date.getFullYear();
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = floor((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1);
  if (monthStart > dayNumber) monthStart = getNewMoonDay(k);
  let a11 = getLunarMonth11(yy);
  let b11 = a11;
  let year: number;

  if (a11 >= monthStart) {
    year = yy;
    a11 = getLunarMonth11(yy - 1);
  } else {
    year = yy + 1;
    b11 = getLunarMonth11(yy + 1);
  }

  const day = dayNumber - monthStart + 1;
  const diff = floor((monthStart - a11) / 29);
  let leap = false;
  let month = diff + 11;

  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11);

    if (diff >= leapMonthDiff) {
      month = diff + 10;
      if (diff === leapMonthDiff) leap = true;
    }
  }

  if (month > 12) month -= 12;
  if (month >= 11 && diff < 4) year -= 1;

  return { day, month, year, leap };
}

/** Solar date of a lunar day; leap months are not used for memorials. */
export function lunarToSolar(day: number, month: number, year: number): Date {
  const [a11, b11] =
    month < 11
      ? [getLunarMonth11(year - 1), getLunarMonth11(year)]
      : [getLunarMonth11(year), getLunarMonth11(year + 1)];

  const k = floor(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  let off = month - 11;
  if (off < 0) off += 12;
  if (b11 - a11 > 365 && off >= getLeapMonthOffset(a11)) off += 1;
  const [d, m, y] = jdToDate(getNewMoonDay(k + off) + day - 1);

  return new Date(y, m - 1, d);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Lunar day for display: "12-10" in Vietnamese, "12 Oct" in English. */
export const lunarLabel = (day: number, month: number, lang: Lang) =>
  lang === 'vi'
    ? `${pad(day)}-${pad(month)}`
    : new Date(2001, month - 1, day).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      });

/**
 * Lunar day and month of the death anniversary (ngày giỗ), from a full solar
 * date of death; undefined when only the year (or nothing) is known.
 */
export function memorialOf(deathDate: string | undefined) {
  const date = deathDate ? parseDate(deathDate) : undefined;
  if (!date) return undefined;

  const { day, month } = solarToLunar(date);

  return { day, month };
}

/** Solar day and month for display: "20-11" in Vietnamese, "20 Nov" in English. */
export const solarLabel = (date: Date, lang: Lang) =>
  lang === 'vi'
    ? `${pad(date.getDate())}-${pad(date.getMonth() + 1)}`
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export type Calendar = 'solar' | 'lunar';
export const CALENDARS: Calendar[] = ['solar', 'lunar'];

/** Numeric full date for display: "02/10/1925". */
const dateLabel = (day: number, month: number, year: number) =>
  `${pad(day)}/${pad(month)}/${year}`;

/** Full solar date: "02/10/1925". */
export const solarDateLabel = (date: Date) =>
  dateLabel(date.getDate(), date.getMonth() + 1, date.getFullYear());

const LEAP: Record<Lang, string> = { vi: 'nhuận', en: 'leap' };

/** Full lunar date: "15/08/1925", leap months marked "(nhuận)" / "(leap)". */
export const lunarDateLabel = (
  { day, month, year, leap }: LunarDate,
  lang: Lang,
) => `${dateLabel(day, month, year)}${leap ? ` (${LEAP[lang]})` : ''}`;

/**
 * A solar date typed or stored as "YYYY-MM-DD", "DD-MM-YYYY" or "DD/MM/YYYY"
 * as a local Date; undefined when malformed or not a real calendar day.
 */
export function parseDate(s: string): Date | undefined {
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s.trim());
  const dmy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(s.trim());

  const parts = iso
    ? [iso[1], iso[2], iso[3]]
    : dmy
      ? [dmy[3], dmy[2], dmy[1]]
      : undefined;

  if (!parts) return undefined;

  const [y, mo, d] = parts.map(Number) as [number, number, number];
  const date = new Date(y, mo - 1, d);

  return date.getFullYear() === y &&
    date.getMonth() === mo - 1 &&
    date.getDate() === d
    ? date
    : undefined;
}

/** A Date as stored: "YYYY-MM-DD". */
export const toISODate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** A stored date as typed in forms: "DD/MM/YYYY", or the bare year. */
export function typedDate(date: string | undefined) {
  if (!date) return '';
  const full = parseDate(date);

  return full ? solarDateLabel(full) : date;
}

/**
 * A typed date in stored form: a full date becomes "YYYY-MM-DD", a bare year
 * stays "YYYY"; anything else is undefined.
 */
export function normalizeDate(s: string): string | undefined {
  const full = parseDate(s);
  if (full) return toISODate(full);

  return /^\d{4}$/.test(s.trim()) ? s.trim() : undefined;
}

/** Next solar occurrence of a lunar day and how many days away it is. */
export function nextMemorial(d: number, m: number, now: Date) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const y = now.getFullYear();

  const date = [y - 1, y, y + 1]
    .map((yy) => lunarToSolar(d, m, yy))
    .find((x) => x >= today)!;

  return { days: Math.round((+date - +today) / 86400000), date };
}
