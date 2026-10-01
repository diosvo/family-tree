import type { Gender, Person } from '@/lib/family-data';

/*
 * The original in-app data set. The store returns it until the first write
 * (see ./store.ts) and saves it along with that write.
 */

/** A year, or a full "YYYY-MM-DD" date when known. */
type When = number | string;

type Opt = Partial<
  Omit<Person, 'id' | 'name' | 'gender' | 'birthDate' | 'deathDate'>
> & { died?: When };

const P = (
  id: string,
  name: string,
  gender: Gender,
  born?: When,
  { died, ...o }: Opt = {},
): Person => ({
  id,
  name,
  gender,
  birthDate: born === undefined ? undefined : String(born),
  deathDate: died === undefined ? undefined : String(died),
  spouseIds: [],
  ...o,
});

export const seedPeople: Person[] = [
  P('p1', 'Nguyễn Văn An', 'male', '1900-03-12', {
    courtesyName: 'Phúc Hậu',
    spouseIds: ['p2'],
    died: '1970-11-10',
  }),
  P('p2', 'Trần Thị Bình', 'female', '1904-03-23', {
    courtesyName: 'Từ Tâm',
    spouseIds: ['p1'],
    fatherId: 'p3',
    motherId: 'p4',
    died: '1978-11-08',
  }),
  P('p3', 'Trần Văn Cường', 'male', '1875-10-06', {
    spouseIds: ['p4'],
    died: '1940-03-23',
  }),
  P('p4', 'Lê Thị Dung', 'female', '1878-05-17', {
    spouseIds: ['p3'],
    died: '1945-08-27',
  }),
  P('p5', 'Nguyễn Văn Đức', 'male', '1925-10-02', {
    courtesyName: 'Minh Đức',
    fatherId: 'p1',
    motherId: 'p2',
    spouseIds: ['p8'],
    died: '1995-12-24',
  }),
  P('p6', 'Nguyễn Thị Hoa', 'female', '1928-07-11', {
    fatherId: 'p1',
    motherId: 'p2',
    spouseIds: ['p11'],
    died: '2001-02-14',
  }),
  P('p7', 'Nguyễn Văn Khang', 'male', '1931-02-22', {
    courtesyName: 'Khang Ninh',
    fatherId: 'p1',
    motherId: 'p2',
    spouseIds: ['p12'],
    died: '2008-11-22',
  }),
  P('p8', 'Phạm Thị Lan', 'female', '1927-09-05', {
    fatherId: 'p9',
    motherId: 'p10',
    spouseIds: ['p5'],
    died: '2003-05-09',
  }),
  P('p9', 'Phạm Văn Minh', 'male', '1898-04-16', {
    spouseIds: ['p10'],
    died: '1961-01-17',
  }),
  P('p10', 'Hoàng Thị Nga', 'female', '1901-11-27', {
    spouseIds: ['p9'],
    died: '1966-04-07',
  }),
  P('p11', 'Lê Văn Phúc', 'male', '1926-06-10', {
    spouseIds: ['p6'],
    died: '1990-08-20',
  }),
  P('p12', 'Đỗ Thị Quyên', 'female', '1934-01-21', {
    fatherId: 'p13',
    motherId: 'p14',
    spouseIds: ['p7'],
    died: '2012-12-30',
  }),
  P('p13', 'Đỗ Văn Sơn', 'male', '1905-08-04', {
    spouseIds: ['p14'],
    died: '1972-06-15',
  }),
  P('p14', 'Vũ Thị Tâm', 'female', '1908-03-15', {
    spouseIds: ['p13'],
    died: '1980-10-22',
  }),
  P('p15', 'Trần Văn Tùng', 'male', '1907-10-26', {
    fatherId: 'p3',
    motherId: 'p4',
    spouseIds: ['p16'],
    died: '1975-11-04',
  }),
  P('p16', 'Bùi Thị Uyên', 'female', '1910-05-09', {
    spouseIds: ['p15'],
    died: '1985-09-22',
  }),
  P('p17', 'Trần Thị Vân', 'female', '1935-12-20', {
    fatherId: 'p15',
    motherId: 'p16',
  }),
  P('p18', 'Nguyễn Văn Bảo', 'male', '1950-02-18', {
    fatherId: 'p5',
    motherId: 'p8',
    spouseIds: ['p28'],
  }),
  P('p19', 'Nguyễn Thị Cúc', 'female', '1953-02-14', {
    fatherId: 'p5',
    motherId: 'p8',
    spouseIds: ['p29'],
  }),
  P('p20', 'Nguyễn Văn Dũng', 'male', '1956-09-25', {
    fatherId: 'p5',
    motherId: 'p8',
    spouseIds: ['p30'],
  }),
  P('p21', 'Lê Văn Giang', 'male', '1951-04-08', {
    fatherId: 'p11',
    motherId: 'p6',
    spouseIds: ['p39'],
  }),
  P('p22', 'Lê Thị Hạnh', 'female', '1955-11-19', {
    fatherId: 'p11',
    motherId: 'p6',
    spouseIds: ['p31'],
  }),
  P('p23', 'Nguyễn Văn Hùng', 'male', '1958-06-02', {
    fatherId: 'p7',
    motherId: 'p12',
    spouseIds: ['p32'],
  }),
  P('p24', 'Nguyễn Thị Kim', 'female', '1961-01-13', {
    fatherId: 'p7',
    motherId: 'p12',
    spouseIds: ['p33'],
  }),
  P('p25', 'Phạm Văn Long', 'male', '1930-08-24', {
    fatherId: 'p9',
    motherId: 'p10',
    spouseIds: ['p26'],
    died: '2010-12-05',
  }),
  P('p26', 'Ngô Thị Mai', 'female', 1933, { spouseIds: ['p25'] }),
  P('p27', 'Phạm Thị Ngọc', 'female', '1960-10-18', {
    fatherId: 'p25',
    motherId: 'p26',
    spouseIds: ['p50'],
  }),
  P('p28', 'Hồ Thị Oanh', 'female', 1952, { spouseIds: ['p18'] }),
  P('p29', 'Đặng Văn Quang', 'male', '1950-12-12', {
    spouseIds: ['p19'],
  }),
  P('p30', 'Vương Thị Sen', 'female', '1958-07-23', {
    spouseIds: ['p20'],
  }),
  P('p31', 'Tạ Văn Thành', 'male', '1953-02-06', {
    spouseIds: ['p22'],
  }),
  P('p32', 'Lý Thị Thu', 'female', '1960-09-17', {
    spouseIds: ['p23'],
  }),
  P('p33', 'Mai Văn Toàn', 'male', '1959-04-28', {
    spouseIds: ['p24'],
  }),
  P('p34', 'Nguyễn Văn Anh', 'male', '1978-07-21', {
    fatherId: 'p18',
    motherId: 'p28',
    spouseIds: ['p45'],
  }),
  P('p35', 'Nguyễn Thị Bích', 'female', '1981-06-22', {
    fatherId: 'p18',
    motherId: 'p28',
  }),
  P('p36', 'Đặng Văn Châu', 'male', '1976-01-05', {
    fatherId: 'p29',
    motherId: 'p19',
  }),
  P('p37', 'Nguyễn Văn Duy', 'male', '1982-08-16', {
    fatherId: 'p20',
    motherId: 'p30',
  }),
  P('p38', 'Nguyễn Thị Giao', 'female', '1985-03-27', {
    fatherId: 'p20',
    motherId: 'p30',
  }),
  P('p39', 'Châu Thị Hằng', 'female', 1954, { spouseIds: ['p21'] }),
  P('p40', 'Lê Văn Hiếu', 'male', '1979-05-21', {
    fatherId: 'p21',
    motherId: 'p39',
  }),
  P('p41', 'Tạ Thị Hương', 'female', '1980-12-04', {
    fatherId: 'p31',
    motherId: 'p22',
  }),
  P('p42', 'Nguyễn Văn Khoa', 'male', '1984-07-15', {
    fatherId: 'p23',
    motherId: 'p32',
    spouseIds: ['p48'],
  }),
  P('p43', 'Nguyễn Thị Linh', 'female', '1987-02-26', {
    fatherId: 'p23',
    motherId: 'p32',
  }),
  P('p44', 'Mai Văn Lực', 'male', '1986-09-09', {
    fatherId: 'p33',
    motherId: 'p24',
  }),
  P('p45', 'Trịnh Thị My', 'female', 1980, { spouseIds: ['p34'] }),
  P('p46', 'Nguyễn Văn Nam', 'male', '2005-09-14', {
    fatherId: 'p34',
    motherId: 'p45',
  }),
  P('p47', 'Nguyễn Thị Nhi', 'female', '2008-06-14', {
    fatherId: 'p34',
    motherId: 'p45',
  }),
  P('p48', 'Kiều Thị Phương', 'female', '1986-01-25', {
    spouseIds: ['p42'],
  }),
  P('p49', 'Nguyễn Văn Quân', 'male', '2010-08-08', {
    fatherId: 'p42',
    motherId: 'p48',
  }),
  P('p50', 'Cao Văn Sang', 'male', 1958, { spouseIds: ['p27'] }),
];
