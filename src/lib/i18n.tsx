import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';

import { oneOf, useStoredState } from './use-stored-state';

export type Lang = 'vi' | 'en';
export const LANGS: Lang[] = ['vi', 'en'];

const en = {
  title: 'Family Tree',
  titleFor: '{s} Family Tree',
  tree: 'Tree',
  library: 'Library',
  memorials: 'Memorials',
  suggestions: 'Suggestions',
  kinship: 'Kinship',
  compareHint: 'Tap two people in the tree',
  details: 'Details',
  clear: 'Clear',
  kinshipWith: 'Kinship with…',
  personA: 'First person',
  personB: 'Second person',
  pickPerson: 'Choose a person',
  swap: 'Swap',
  isOf: '{b} is {a}’s {rel}',
  calls: '{a} calls {b}',
  relationPath: 'Path',
  noRelation: 'No family relationship found between these two people.',
  regionNote: 'Terms of address vary between families and regions.',
  region: 'Terms',
  north: 'Northern',
  south: 'Southern',
  add: 'Add',
  admin: 'Admin',
  adminPasscode: 'Admin passcode',
  wrongPasscode: 'Wrong passcode',
  search: 'Search name, courtesy name, or year…',
  noMatch: 'No match',
  loadingTree: 'Loading tree…',
  mainTree: 'Main tree',
  everyone: 'Everyone',
  people: 'people',
  all: 'All',
  women: 'Women',
  men: 'Men',
  male: 'Male',
  female: 'Female',
  name: 'Name',
  courtesyName: 'Courtesy name',
  birth: 'Date of birth',
  age: 'Age',
  died: 'Died',
  diedIn: 'Died in',
  living: 'Living',
  deceased: 'Deceased',
  lunar: 'Lunar',
  solar: 'Solar',
  allLevels: 'All levels',
  level: 'Level {n}',
  todayLunar: 'Today is {d} in the lunar calendar',
  memorialShort: 'Memorial {d} (lunar)',
  upcoming: 'Upcoming death anniversaries (ngày giỗ)',
  today: 'Today',
  days: 'days',
  daysLeft: 'Days left',
  noSuggestions:
    'No pending suggestions. Open a person in the tree to suggest information.',
  by: 'by',
  madeWith: 'Made with',
  accept: 'Accept',
  dismiss: 'Dismiss',
  removed: 'Removed',
  addPerson: 'Add person',
  fullName: 'Full name *',
  birthDate: 'Born, solar (DD/MM/YYYY or YYYY)',
  deathDate: 'Died, solar (DD/MM/YYYY or YYYY)',
  father: 'Father',
  mother: 'Mother',
  none: '—',
  close: 'Close',
  more: 'More',
  showMore: 'Show {n} more',
  less: 'Less',
  focusFamily: 'Focus family',
  fathersFamily: "Father's family",
  mothersFamily: "Mother's family",
  wifesFamily: "Wife's family",
  husbandsFamily: "Husband's family",
  parents: 'Parents',
  spouse: 'Spouse',
  siblings: 'Siblings',
  children: 'Children',
  moreChildren: 'Show {n} more children',
  suggest: 'Suggest a correction',
  newInfo: 'New info',
  yourName: 'Your name (optional)',
  sent: 'Sent — thank you!',
  send: 'Send suggestion',
  removePerson: 'Remove person',
  confirmRemove: 'Remove {name}?',
  field_name: 'Name',
  field_courtesyName: 'Courtesy name',
  field_birthDate: 'Date of birth, solar (DD/MM/YYYY or YYYY)',
  field_deathDate: 'Date of death, solar (DD/MM/YYYY or YYYY)',
  field_other: 'Other note',
};

const vi: Record<Key, string> = {
  title: 'Gia Phả',
  titleFor: 'Gia Phả họ {s}',
  tree: 'Cây gia phả',
  library: 'Danh sách',
  memorials: 'Ngày giỗ',
  suggestions: 'Góp ý',
  kinship: 'Xưng hô',
  compareHint: 'Chạm vào 2 người trên cây',
  details: 'Chi tiết',
  clear: 'Xoá',
  kinshipWith: 'Xưng hô với…',
  personA: 'Người thứ nhất',
  personB: 'Người thứ hai',
  pickPerson: 'Chọn một người',
  swap: 'Đổi chỗ',
  isOf: '{b} là {rel} của {a}',
  calls: '{a} gọi {b} là',
  relationPath: 'Đường quan hệ',
  noRelation: 'Không tìm thấy quan hệ họ hàng giữa hai người này.',
  regionNote: 'Cách xưng hô có thể khác nhau giữa các gia đình và vùng miền.',
  region: 'Cách gọi',
  north: 'Miền Bắc',
  south: 'Miền Nam',
  add: 'Thêm',
  admin: 'Quản trị',
  adminPasscode: 'Mã quản trị',
  wrongPasscode: 'Sai mã',
  search: 'Tìm tên, tự hoặc năm sinh…',
  noMatch: 'Không tìm thấy',
  loadingTree: 'Đang tải cây…',
  mainTree: 'Cây chính',
  everyone: 'Tất cả',
  people: 'người',
  all: 'Tất cả',
  women: 'Nữ',
  men: 'Nam',
  male: 'Nam',
  female: 'Nữ',
  name: 'Họ tên',
  courtesyName: 'Tự',
  birth: 'Ngày tháng năm sinh',
  age: 'Tuổi',
  died: 'Mất',
  diedIn: 'Mất năm',
  living: 'Còn sống',
  deceased: 'Đã mất',
  lunar: 'Âm lịch',
  solar: 'Dương lịch',
  allLevels: 'Tất cả các đời',
  level: 'Đời {n}',
  todayLunar: 'Hôm nay là {d} âm lịch',
  memorialShort: 'Giỗ {d} ÂL',
  upcoming: 'Ngày giỗ sắp tới',
  today: 'Hôm nay',
  days: 'ngày',
  daysLeft: 'Còn lại',
  noSuggestions:
    'Chưa có góp ý nào. Mở một người trong cây để góp ý thông tin.',
  by: 'bởi',
  madeWith: 'Được làm bằng cả',
  accept: 'Chấp nhận',
  dismiss: 'Bỏ qua',
  removed: 'Đã xoá',
  addPerson: 'Thêm người',
  fullName: 'Họ và tên *',
  birthDate: 'Ngày sinh DL (ngày/tháng/năm hoặc năm)',
  deathDate: 'Ngày mất DL (ngày/tháng/năm hoặc năm)',
  father: 'Cha',
  mother: 'Mẹ',
  none: '—',
  close: 'Đóng',
  more: 'Xem thêm',
  showMore: 'Xem thêm {n} người',
  less: 'Thu gọn',
  focusFamily: 'Dòng họ',
  fathersFamily: 'Bên nội',
  mothersFamily: 'Bên ngoại',
  wifesFamily: 'Bên vợ',
  husbandsFamily: 'Bên chồng',
  parents: 'Cha mẹ',
  spouse: 'Vợ/Chồng',
  siblings: 'Anh chị em',
  children: 'Con',
  moreChildren: 'Hiện thêm {n} người con',
  suggest: 'Góp ý chỉnh sửa',
  newInfo: 'Thông tin mới',
  yourName: 'Tên của bạn (không bắt buộc)',
  sent: 'Đã gửi — cảm ơn!',
  send: 'Gửi góp ý',
  removePerson: 'Xoá người này',
  confirmRemove: 'Xoá {name}?',
  field_name: 'Họ tên',
  field_courtesyName: 'Tự',
  field_birthDate: 'Ngày sinh dương lịch (ngày/tháng/năm hoặc năm)',
  field_deathDate: 'Ngày mất dương lịch (ngày/tháng/năm hoặc năm)',
  field_other: 'Ghi chú khác',
};

export type Key = keyof typeof en;

const dict: Record<Lang, Record<Key, string>> = { en, vi };
type Vars = Record<string, string | number>;

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: Key, vars?: Vars) => string;
};
const LangCtx = createContext<Ctx | null>(null);
const langCodec = oneOf(LANGS);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useStoredState<Lang>('ft-lang', 'vi', langCodec);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      setLang,
      t: (k, vars) =>
        Object.entries(vars ?? {}).reduce(
          (s, [a, b]) => s.replace(`{${a}}`, String(b)),
          dict[lang][k],
        ),
    }),
    [lang, setLang],
  );

  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export const useT = () => {
  const c = useContext(LangCtx);
  if (!c) throw new Error('LangProvider missing');

  return c;
};
