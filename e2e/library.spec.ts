import {
  PEOPLE,
  expect,
  nav,
  openTab,
  panel,
  pickOption,
  test,
  treeNode,
} from './fixtures';

import type { Page } from '@playwright/test';

const count = (app: Page) => app.getByText(/^\d+ \/ \d+ people$/);
const rows = (app: Page) => app.locator('tbody tr');

const button = (app: Page, name: string) =>
  app.getByRole('button', { name, exact: true });

test.beforeEach(async ({ app }) => {
  await openTab(app, 'Library');
});

test('hides the tree and lists people oldest first, ten at a time', async ({
  app,
}) => {
  await expect(app.locator('.react-flow')).toBeHidden();

  await expect(app.locator('thead').getByRole('columnheader')).toHaveText([
    'Name',
    'Date of birth',
    'Died',
    'Age',
  ]);

  await expect(rows(app)).toHaveCount(10);
  await expect(count(app)).toHaveText(/^10 \/ \d+ people$/);

  // Trần Văn Cường, 1875–1940, is the oldest person in the seed data
  const first = rows(app).first();
  await expect(first).toContainText('Trần Văn Cường');
  await expect(first.locator('td').nth(1)).toHaveText('06/10/1875');
  await expect(first.locator('td').nth(2)).toHaveText('23/03/1940');
  await expect(first.locator('td').nth(3)).toContainText('65');
});

test('"Show more" reveals the next page', async ({ app }) => {
  const more = app.getByRole('button', { name: /^Show \d+ more$/ });
  await expect(more).toHaveText('Show 10 more');

  await more.click();
  await expect(rows(app)).toHaveCount(20);
  await expect(count(app)).toHaveText(/^20 \/ \d+ people$/);
});

test('gender filter narrows the list and "All" restores it', async ({
  app,
}) => {
  const total = (await count(app).textContent()) ?? '';
  const men = app.locator('tbody tr[style*="--male"]');
  const women = app.locator('tbody tr[style*="--female"]');

  await button(app, 'Women').click();
  await expect(button(app, 'Women')).toHaveAttribute('aria-pressed', 'true');
  await expect(count(app)).not.toHaveText(total);
  await expect(men).toHaveCount(0);
  expect(await women.count()).toBeGreaterThan(0);

  await button(app, 'Men').click();
  await expect(button(app, 'Men')).toHaveAttribute('aria-pressed', 'true');
  await expect(women).toHaveCount(0);
  expect(await men.count()).toBeGreaterThan(0);

  await button(app, 'All').click();
  await expect(button(app, 'All')).toHaveAttribute('aria-pressed', 'true');
  await expect(count(app)).toHaveText(total);
});

test('changing a filter goes back to the first page', async ({ app }) => {
  await app.getByRole('button', { name: /^Show \d+ more$/ }).click();
  await expect(rows(app)).toHaveCount(20);

  await button(app, 'Women').click();
  await expect(count(app)).toHaveText(/^10 \/ \d+ people$/);
});

test('generation level filter', async ({ app }) => {
  const level = app.getByRole('combobox');
  await expect(level).toContainText('All levels');

  // Level 1 is the root's generation: An, Bình, her brother and his wife, and
  // the parents of the people their children married
  await pickOption(level, 'Level 1');
  await expect(count(app)).toHaveText('8 / 8 people');

  await expect(rows(app)).toContainText([
    PEOPLE.an.name,
    PEOPLE.binh.name,
    'Trần Văn Tùng',
    'Bùi Thị Uyên',
  ]);

  await pickOption(level, 'All levels');
  await expect(count(app)).toHaveText(/^10 \/ \d+ people$/);
});

test('dates can be shown in the lunar calendar', async ({ app }) => {
  const born = rows(app).first().locator('td').nth(1);
  await expect(button(app, 'Solar')).toHaveAttribute('aria-pressed', 'true');
  await expect(born).toHaveText('06/10/1875');

  await button(app, 'Lunar').click();
  await expect(button(app, 'Lunar')).toHaveAttribute('aria-pressed', 'true');
  await expect(born).not.toHaveText('06/10/1875');
  await expect(born).toHaveText(/^\d{2}\/\d{2}\/\d{4}( \(leap\))?$/);

  await button(app, 'Solar').click();
  await expect(born).toHaveText('06/10/1875');
});

test('the search box filters the list', async ({ app }) => {
  const box = app.getByRole('textbox', { name: /^Search/ });

  await box.fill(PEOPLE.van.name);
  await expect(app.getByTestId('search-results')).toBeHidden();
  await expect(rows(app)).toHaveCount(1);
  await expect(rows(app).first()).toContainText(PEOPLE.van.name);
  await expect(count(app)).toHaveText('1 / 1 people');

  await box.fill('zzz-nobody');
  await expect(app.locator('table')).toBeHidden();
  await expect(app.getByRole('status')).toContainText('No match');

  await expect(app.getByRole('status')).toContainText(
    'No one matches the current search or filters.',
  );
});

test('clicking a row opens the person on the tree', async ({ app }) => {
  await rows(app).first().click();

  await expect(nav(app).getByRole('button', { name: 'Tree' })).toHaveAttribute(
    'aria-current',
    'page',
  );

  await expect(panel(app).getByRole('heading', { level: 2 })).toContainText(
    'Trần Văn Cường',
  );

  // He is outside the main house, so the tree grows to include him
  await expect(treeNode(app, 'p3')).toBeVisible();

  await expect(app.getByRole('heading', { level: 1 })).toHaveText(
    'Trần Family Tree',
  );
});
