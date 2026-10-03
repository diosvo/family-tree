import { describe, expect, it } from 'vitest';

import { person as P, marry } from '@/test/people';

import { kinLabel, kinship } from './kinship';

/*
 * One family seen from "ego" (born 1955):
 *
 *   gf ─ gm                                  ongNgoai ─ baNgoai
 *   ├─ bac (M 1920) ─ ? → cousinOld (M 1960)  ├─ cau (M 1924) ─ mo
 *   ├─ co (F 1922) ─ duong                    ├─ me (F 1927)
 *   ├─ cha (M 1925) ─ me, ─ other             └─ di (F 1932)
 *   └─ chu (M 1930) ─ thim → cousinYoung (M 1950)
 *
 *   cha + me    → anh (M 1950) ─ chiDau, ego (M 1955) ─ vo, em (F 1960)
 *   cha + other → halfSis (F 1965)
 *   boVo → vo;  ego + vo → con (M 1980) ─ conDau ← ongTG;  con → chau (M 2005)
 *
 * plus, for the rarer terms: second marriages (stepDad, baKe, ongKe), more
 * siblings on each side, the wife's family (ongVo → boVo ─ meVo → anhVo,
 * emVo), children from other marriages (conRieng, conRiengEgo), descendants
 * down to the 6th generation (chut, chit), twins (tw1, tw2) and someone with
 * no birth year (tw3), and a child of two cousins (cc).
 */
const people = marry(
  [
    P('gf', 'male', 1900),
    P('baKe', 'female', 1910),
    P('ongKe', 'male', 1905),
    P('stepDad', 'male', 1920),
    P('gm', 'female', 1902),
    P('ongNgoai', 'male', 1898),
    P('baNgoai', 'female', 1900),
    P('bac', 'male', 1920, { fatherId: 'gf', motherId: 'gm' }),
    P('co', 'female', 1922, { fatherId: 'gf', motherId: 'gm' }),
    P('duong', 'male', 1921),
    P('cha', 'male', 1925, { fatherId: 'gf', motherId: 'gm' }),
    P('chu', 'male', 1930, { fatherId: 'gf', motherId: 'gm' }),
    P('thim', 'female', 1932),
    P('cau', 'male', 1924, { fatherId: 'ongNgoai', motherId: 'baNgoai' }),
    P('mo', 'female', 1926),
    P('me', 'female', 1927, { fatherId: 'ongNgoai', motherId: 'baNgoai' }),
    P('di', 'female', 1932, { fatherId: 'ongNgoai', motherId: 'baNgoai' }),
    P('duongDi', 'male', 1930),
    P('diLon', 'female', 1925, { fatherId: 'ongNgoai', motherId: 'baNgoai' }),
    P('coNho', 'female', 1935, { fatherId: 'gf', motherId: 'gm' }),
    P('other', 'female', 1940),
    P('cousinOld', 'male', 1960, { fatherId: 'bac' }),
    P('cousinYoung', 'male', 1950, { fatherId: 'chu', motherId: 'thim' }),
    P('cousinWife', 'female', 1952),
    P('cousinOldSon', 'male', 1985, { fatherId: 'cousinOld' }),
    P('halfBro', 'male', 1945, { fatherId: 'stepDad', motherId: 'me' }),
    P('chiGai', 'female', 1948, { fatherId: 'cha', motherId: 'me' }),
    P('anhRe', 'male', 1946),
    P('anh', 'male', 1950, { fatherId: 'cha', motherId: 'me' }),
    P('chiDau', 'female', 1952),
    P('ego', 'male', 1955, { fatherId: 'cha', motherId: 'me' }),
    P('em', 'female', 1960, { fatherId: 'cha', motherId: 'me' }),
    P('halfSis', 'female', 1965, { fatherId: 'cha', motherId: 'other' }),
    P('ongVo', 'male', 1900),
    P('boVo', 'male', 1930, { fatherId: 'ongVo' }),
    P('meVo', 'female', 1932),
    P('anhVo', 'male', 1950, { fatherId: 'boVo', motherId: 'meVo' }),
    P('vo', 'female', 1957, { fatherId: 'boVo', motherId: 'meVo' }),
    P('emVo', 'female', 1960, { fatherId: 'boVo', motherId: 'meVo' }),
    P('conRieng', 'female', 1976, { motherId: 'vo' }),
    // Listed before `con`, with a spouse who is not saved.
    P('conRiengEgo', 'male', 1978, { fatherId: 'ego', spouseIds: ['ghost'] }),
    P('con', 'male', 1980, { fatherId: 'ego', motherId: 'vo' }),
    P('conGai', 'female', 1985, { fatherId: 'ego', motherId: 'vo' }),
    P('conRe', 'male', 1983),
    P('ongTG', 'male', 1955),
    P('baTG', 'female', 1957),
    P('conDau', 'female', 1982, { fatherId: 'ongTG', motherId: 'baTG' }),
    P('chau', 'male', 2005, { fatherId: 'con', motherId: 'conDau' }),
    P('chauGai', 'female', 2008, { fatherId: 'con', motherId: 'conDau' }),
    P('chauWife', 'female', 2006),
    P('chut', 'male', 2030, { fatherId: 'chau', motherId: 'chauWife' }),
    P('chit', 'male', 2055, { fatherId: 'chut' }),
    P('tw1', 'male', 1975, { fatherId: 'anh', motherId: 'chiDau' }),
    P('tw2', 'female', 1975, { fatherId: 'anh', motherId: 'chiDau' }),
    P('tw3', 'male', undefined, { fatherId: 'anh', motherId: 'chiDau' }),
    P('cc', 'male', 1975, { fatherId: 'cousinYoung', motherId: 'em' }),
  ],
  ['gf', 'gm'],
  ['ongNgoai', 'baNgoai'],
  ['co', 'duong'],
  ['cha', 'me'],
  ['cha', 'other'],
  ['chu', 'thim'],
  ['cau', 'mo'],
  ['anh', 'chiDau'],
  ['ego', 'vo'],
  ['con', 'conDau'],
  ['gf', 'baKe'],
  ['baNgoai', 'ongKe'],
  ['me', 'stepDad'],
  ['di', 'duongDi'],
  ['cousinYoung', 'cousinWife'],
  ['chiGai', 'anhRe'],
  ['boVo', 'meVo'],
  ['conGai', 'conRe'],
  ['ongTG', 'baTG'],
  ['chau', 'chauWife'],
);

const rel = (a: string, b: string, region: 'north' | 'south' = 'north') =>
  kinship(people, a, b, region);

/** [vi, aCalls, bCalls] of B relative to A. */
const terms = (a: string, b: string, region: 'north' | 'south' = 'north') => {
  const k = rel(a, b, region);

  return k && [k.vi, k.aCalls, k.bCalls];
};

describe('kinship', () => {
  it('names the same person and unknown ids', () => {
    expect(terms('ego', 'ego')).toEqual(['chính mình', '—', '—']);
    expect(rel('ego', 'nobody')).toBeNull();
  });

  it('finds no relationship between unrelated families', () => {
    expect(rel('boVo', 'gf')).toBeNull();
  });

  it('uses the North by default', () => {
    expect(kinship(people, 'ego', 'cha')?.vi).toBe('bố');
  });

  it('returns the path between the two people', () => {
    expect(rel('ego', 'cousinOld')?.path.map((p) => p.id)).toEqual([
      'ego',
      'cha',
      'gf',
      'bac',
      'cousinOld',
    ]);
  });

  it('labels in English with the Vietnamese term alongside', () => {
    const k = rel('ego', 'gf')!;
    expect(kinLabel(k, 'vi')).toBe('ông nội');
    expect(kinLabel(k, 'en')).toBe('paternal grandfather (ông nội)');
  });

  describe('parents and children', () => {
    it('uses bố/mẹ in the North and ba/má in the South', () => {
      expect(terms('ego', 'cha', 'north')).toEqual(['bố', 'bố', 'con']);
      expect(terms('ego', 'me', 'north')).toEqual(['mẹ', 'mẹ', 'con']);
      expect(terms('ego', 'cha', 'south')).toEqual(['ba', 'ba', 'con']);
      expect(terms('ego', 'me', 'south')).toEqual(['má', 'má', 'con']);
      expect(rel('ego', 'me')?.en).toBe('mother');
    });

    it('names sons and daughters', () => {
      expect(terms('ego', 'con')).toEqual(['con trai', 'con', 'bố']);
      expect(terms('cha', 'em', 'south')).toEqual(['con gái', 'con', 'ba']);
      expect(rel('ego', 'con')?.en).toBe('son');
    });
  });

  describe('grandparents and descendants', () => {
    it('tells the father’s side (nội) from the mother’s (ngoại)', () => {
      expect(terms('ego', 'gf')).toEqual(['ông nội', 'ông nội', 'cháu']);
      expect(terms('ego', 'baNgoai')).toEqual(['bà ngoại', 'bà ngoại', 'cháu']);
      expect(rel('ego', 'gf')?.en).toBe('paternal grandfather');
      expect(rel('ego', 'baNgoai')?.en).toBe('maternal grandmother');
    });

    it('names grandchildren by the side they descend through', () => {
      expect(terms('gf', 'ego')).toEqual(['cháu nội', 'cháu', 'ông nội']);

      expect(terms('ongNgoai', 'ego')).toEqual([
        'cháu ngoại',
        'cháu',
        'ông ngoại',
      ]);

      expect(rel('gf', 'em')?.en).toBe("granddaughter (son's child)");
      expect(rel('ongNgoai', 'ego')?.en).toBe("grandson (daughter's child)");
    });

    it('uses cụ in the North and ông cố in the South for great-grandparents', () => {
      expect(terms('gf', 'con', 'north')).toEqual(['chắt', 'chắt', 'cụ']);
      expect(terms('gf', 'con', 'south')).toEqual(['chắt', 'chắt', 'ông cố']);
      expect(terms('con', 'gf', 'north')).toEqual(['cụ', 'cụ', 'chắt']);
      expect(rel('con', 'gf')?.en).toBe('great-grandparent');
    });

    it('names every generation, up to the distant ancestors', () => {
      expect(terms('gf', 'chau')).toEqual(['chút', 'chút', 'kị']);
      expect(rel('gf', 'chau')?.en).toBe('great-great-grandchild');
      expect(terms('chau', 'gf')).toEqual(['kị', 'kị', 'chút']);
      expect(rel('chau', 'gf')?.en).toBe('great-great-grandparent');
      expect(rel('chau', 'gm', 'south')?.vi).toBe('bà sơ');
      expect(terms('gf', 'chut')).toEqual(['chít', 'chít', 'tổ tiên']);
      expect(terms('gf', 'chit')).toEqual(['cháu', 'cháu', 'tổ tiên']);
    });
  });

  describe('siblings', () => {
    it('uses anh/chị for elders and em for the younger', () => {
      expect(terms('ego', 'anh')).toEqual(['anh trai', 'anh', 'em']);
      expect(terms('ego', 'chiGai')).toEqual(['chị gái', 'chị', 'em']);
      expect(terms('ego', 'em')).toEqual(['em gái', 'em', 'anh']);
      expect(terms('anh', 'ego')).toEqual(['em trai', 'em', 'anh']);
      expect(terms('em', 'ego')).toEqual(['anh trai', 'anh', 'em']);
    });

    it('marks half-siblings by the father or the mother', () => {
      expect(rel('ego', 'halfSis')).toMatchObject({
        vi: 'em gái (cùng cha khác mẹ)',
        en: 'younger sister (half, same father)',
      });

      expect(rel('ego', 'halfBro')?.vi).toBe('anh trai (cùng mẹ khác cha)');
    });

    it('falls back to the order of entry when birth years tie or are missing', () => {
      expect(rel('tw1', 'tw2')?.vi).toBe('em gái');
      expect(rel('tw2', 'tw1')?.vi).toBe('anh trai');
      expect(rel('tw1', 'tw3')?.vi).toBe('em trai');
    });
  });

  describe("parents' siblings", () => {
    it('on the father’s side: bác for elders, chú for younger brothers', () => {
      expect(terms('ego', 'bac')).toEqual(['bác', 'bác', 'cháu']);
      expect(terms('ego', 'chu')).toEqual(['chú', 'chú', 'cháu']);
    });

    it('calls the father’s older sister bác in the North, cô in the South', () => {
      expect(rel('ego', 'co', 'north')?.vi).toBe('bác');
      expect(rel('ego', 'co', 'south')?.vi).toBe('cô');
      expect(rel('ego', 'coNho', 'north')?.vi).toBe('cô');
    });

    it('calls the mother’s elder siblings bác in the North only', () => {
      expect(rel('ego', 'cau', 'north')).toMatchObject({
        vi: 'bác',
        en: "mother's older brother",
      });

      expect(rel('ego', 'cau', 'south')?.vi).toBe('cậu');
      expect(rel('ego', 'di', 'north')?.vi).toBe('dì');
      expect(rel('ego', 'di', 'south')?.vi).toBe('dì');
      expect(rel('ego', 'diLon', 'north')?.en).toBe("mother's older sister");
    });

    it('uses ông/bà for a grandparent’s siblings, cụ one generation up', () => {
      expect(terms('con', 'bac')).toEqual(['ông bác', 'ông', 'cháu']);
      expect(terms('con', 'co')).toEqual(['bà bác', 'bà', 'cháu']);
      expect(rel('con', 'co')?.en).toBe('great-aunt');
      expect(terms('chau', 'bac')).toEqual(['cụ', 'cụ', 'chắt']);
      expect(rel('chau', 'bac')?.en).toBe('great-great-uncle');
      expect(rel('chau', 'co')?.en).toBe('great-great-aunt');
    });

    it('goes the other way for nephews, nieces and their children', () => {
      expect(terms('anh', 'con')).toEqual(['cháu trai', 'cháu', 'bác']);
      expect(terms('anh', 'conGai')).toEqual(['cháu gái', 'cháu', 'bác']);
      expect(rel('anh', 'chau')?.en).toBe('grand-nephew');

      expect(rel('anh', 'chauGai')).toMatchObject({
        vi: 'cháu (họ)',
        en: 'grand-niece',
      });
    });

    it('counts a common ancestor once when both parents descend from them', () => {
      expect(terms('ego', 'cc')).toEqual(['cháu trai', 'cháu', 'bác']);
    });
  });

  describe('cousins', () => {
    it('ranks cousins by their parents’ seniority, not their own ages', () => {
      // Born after ego, but the son of cha's elder brother.
      expect(terms('ego', 'cousinOld')).toEqual(['anh họ', 'anh', 'em']);
      // Born before ego, but the son of cha's younger brother.
      expect(terms('ego', 'cousinYoung')).toEqual(['em họ', 'em', 'anh']);
      expect(rel('ego', 'cousinOld')?.en).toBe('older cousin');
    });

    it('names distant cousins and cousins of another generation', () => {
      expect(rel('con', 'cousinOldSon')).toMatchObject({
        vi: 'anh họ xa',
        en: 'older cousin (distant)',
      });

      expect(terms('con', 'cousinOld')).toEqual(['bác (họ)', 'bác', 'cháu']);
      expect(terms('cousinOld', 'con')).toEqual(['cháu (họ)', 'cháu', 'bác']);
    });
  });

  describe('marriage', () => {
    it('names spouses', () => {
      expect(terms('ego', 'vo')).toEqual(['vợ', 'em / mình', 'anh / mình']);
      expect(terms('vo', 'ego')).toEqual(['chồng', 'anh / mình', 'em / mình']);
    });

    it('names step-parents', () => {
      expect(terms('ego', 'stepDad')).toEqual(['bố dượng', 'dượng', 'con']);
      expect(rel('ego', 'stepDad')?.en).toBe('stepfather');
      expect(rel('ego', 'other')?.vi).toBe('mẹ kế');
    });

    it('calls a grandparent’s other spouse ông or bà', () => {
      expect(terms('ego', 'baKe')).toEqual(['bà', 'bà', 'cháu']);
      expect(terms('ego', 'ongKe')).toEqual(['ông', 'ông', 'cháu']);
    });

    it('names the spouses of blood relatives', () => {
      expect(terms('ego', 'thim')).toEqual(['thím', 'thím', 'cháu']);
      expect(rel('ego', 'mo', 'south')?.vi).toBe('mợ');
      expect(rel('ego', 'mo', 'north')?.vi).toBe('bác gái');
      expect(rel('ego', 'duong', 'south')?.vi).toBe('dượng');
      expect(rel('ego', 'duong', 'north')?.vi).toBe('bác');
      expect(rel('ego', 'duongDi', 'north')?.vi).toBe('chú');
      expect(rel('ego', 'duongDi', 'south')?.vi).toBe('dượng');
      expect(terms('ego', 'chiDau')).toEqual(['chị dâu', 'chị', 'em']);
      expect(terms('ego', 'anhRe')).toEqual(['anh rể', 'anh', 'em']);
      expect(terms('ego', 'cousinWife')).toEqual(['em dâu (họ)', 'em', 'anh']);
      expect(terms('ego', 'conDau')).toEqual(['con dâu', 'con', 'bố']);
      expect(terms('ego', 'conRe')).toEqual(['con rể', 'con', 'bố']);
      expect(terms('ego', 'chauWife')).toEqual(['cháu dâu', 'cháu', 'ông nội']);
      expect(terms('gf', 'chauWife')).toEqual(['chút dâu', 'chút', 'kị']);
    });

    it('names the spouse’s family', () => {
      expect(terms('ego', 'boVo')).toEqual(['bố vợ', 'bố', 'con']);
      expect(rel('ego', 'boVo')?.en).toBe('father-in-law');

      expect(rel('ego', 'meVo')).toMatchObject({
        vi: 'mẹ vợ',
        en: 'mother-in-law',
      });

      expect(terms('ego', 'anhVo')).toEqual(['anh vợ', 'anh', 'em']);
      expect(rel('ego', 'anhVo')?.en).toBe('brother-in-law');
      expect(terms('ego', 'emVo')).toEqual(['em vợ', 'em', 'anh']);
      expect(rel('ego', 'emVo')?.en).toBe('sister-in-law');
      expect(rel('vo', 'anh')?.vi).toBe('anh chồng');

      expect(rel('ego', 'ongVo')).toMatchObject({
        vi: 'ông nội (bên vợ)',
        en: "paternal grandfather (wife's side)",
      });
    });

    it('names a spouse’s children from another marriage', () => {
      expect(terms('ego', 'conRieng')).toEqual([
        'con riêng của vợ',
        'con',
        'dượng',
      ]);

      expect(terms('vo', 'conRiengEgo')).toEqual([
        'con riêng của chồng',
        'con',
        'dì',
      ]);

      expect(rel('vo', 'conRiengEgo')?.en).toBe("husband's child (step-child)");
    });

    it('names both parents of a child’s spouse thông gia', () => {
      expect(terms('ego', 'ongTG')).toEqual([
        'thông gia',
        'ông thông gia',
        'ông thông gia',
      ]);

      expect(terms('ego', 'baTG')).toEqual([
        'thông gia',
        'bà thông gia',
        'ông thông gia',
      ]);

      expect(terms('vo', 'ongTG')).toEqual([
        'thông gia',
        'ông thông gia',
        'bà thông gia',
      ]);
    });

    it('skips spouses who are not saved', () => {
      expect(rel('conRiengEgo', 'ongTG')).toBeNull();
    });
  });
});
