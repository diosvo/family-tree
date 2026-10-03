import {
  PEOPLE,
  expect,
  it,
  langButton,
  nav,
  openTab,
  panel,
  test,
} from './fixtures';

import type { Page } from '@playwright/test';

/** Anniversaries this close are highlighted (MemorialList.SOON). */
const SOON = 30;

const rows = (app: Page) => app.locator('tbody tr');
const daysCell = (row: ReturnType<typeof rows>) => row.locator('td').last();

const parseDays = (text: string) =>
  text.trim() === 'Today' ? 0 : Number.parseInt(text, 10);

test.beforeEach(async ({ app }) => {
  await openTab(app, 'Memorials');
});

it('shows the heading, today in the lunar calendar and the columns', async ({
  app,
}) => {
  await expect(app.locator('.react-flow')).toBeHidden();

  await expect(
    app.getByText('Upcoming death anniversaries (ngày giỗ)'),
  ).toBeVisible();

  await expect(
    app.getByText(/^Today is \d{1,2} [A-Z][a-z]{2} in the lunar calendar$/),
  ).toBeVisible();

  await expect(app.locator('thead').getByRole('columnheader')).toHaveText([
    'Name',
    'Lunar',
    'Solar',
    'Died in',
    'Days left',
  ]);
});

it('lists people with a full date of death, soonest first', async ({ app }) => {
  await expect(rows(app).first()).toBeVisible();

  const texts = await rows(app).locator('td:last-child').allTextContents();
  const days = texts.map(parseDays);

  expect(days.length).toBeGreaterThan(0);
  expect(days.every(Number.isFinite)).toBe(true);
  expect(days).toEqual([...days].sort((a, b) => a - b));
  expect(days.at(-1)).toBeLessThan(366);

  // An died on 10 Nov 1970; his row shows the lunar and solar dates
  const an = rows(app).filter({ hasText: PEOPLE.an.name });
  await expect(an).toHaveCount(1);
  await expect(an.locator('td').nth(1)).toHaveText(/^\d{1,2} [A-Z][a-z]{2}$/);
  await expect(an.locator('td').nth(2)).toHaveText(/^\d{1,2} [A-Z][a-z]{2}$/);
  await expect(an.locator('td').nth(3)).toHaveText('1970');

  // Only a year of death is known for nobody here; a living person never shows
  await expect(rows(app).filter({ hasText: PEOPLE.bao.name })).toHaveCount(0);
});

it(`anniversaries within ${SOON} days are highlighted, later ones muted`, async ({
  app,
}) => {
  await expect(rows(app).first()).toBeVisible();
  const n = await rows(app).count();

  for (let i = 0; i < n; i++) {
    const cell = daysCell(rows(app).nth(i));
    const days = parseDays(await cell.innerText());

    if (days <= SOON) await expect(cell).toHaveClass(/font-bold/);
    else await expect(cell).toHaveClass(/text-muted-foreground/);
  }
});

it('clicking a row opens the person on the tree', async ({ app }) => {
  const an = rows(app).filter({ hasText: PEOPLE.an.name });
  await an.click();

  await expect(nav(app).getByRole('button', { name: 'Tree' })).toHaveAttribute(
    'aria-current',
    'page',
  );

  await expect(panel(app).getByRole('heading', { level: 2 })).toContainText(
    PEOPLE.an.name,
  );

  await expect(panel(app)).toContainText(
    /Memorial \d{1,2} [A-Z][a-z]{2} \(lunar\)/,
  );
});

it('Vietnamese shows lunar dates as day-month', async ({ app }) => {
  await langButton(app, 'vi').click();
  await expect(app.getByText('Ngày giỗ sắp tới')).toBeVisible();

  await expect(app.getByText(/^Hôm nay là \d{2}-\d{2} âm lịch$/)).toBeVisible();

  await expect(rows(app).first().locator('td').nth(1)).toHaveText(
    /^\d{2}-\d{2}$/,
  );
});

it('the search box filters the list', async ({ app }) => {
  const box = app.getByRole('textbox', { name: /^Search/ });

  await box.fill(PEOPLE.an.name);
  await expect(app.getByTestId('search-results')).toBeHidden();
  await expect(rows(app)).toHaveCount(1);
  await expect(rows(app).first()).toContainText(PEOPLE.an.name);

  // Đức died in 1995.
  await box.fill('1995');
  await expect(rows(app)).toHaveCount(1);
  await expect(rows(app).first()).toContainText(PEOPLE.duc.name);

  await box.fill('zzz-nobody');
  await expect(app.locator('table')).toBeHidden();
  await expect(app.getByRole('status')).toContainText('No match');
});
