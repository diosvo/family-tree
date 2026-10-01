import {
  PEOPLE,
  expect,
  openTab,
  panel,
  personSelect,
  pickOption,
  test,
  treeNode,
} from './fixtures';

import type { Page } from '@playwright/test';

/*
 * State that belongs to the page, not to one tab: it must survive a trip to
 * the other tabs and back.
 */

const option = (p: { name: string; year: number }) => `${p.name} (${p.year})`;
const searchBox = (app: Page) => app.getByRole('textbox', { name: /^Search/ });
const libraryRows = (app: Page) => app.locator('tbody tr');

/** Visit every other read-only tab, then come back to Tree. */
async function tourTabs(app: Page) {
  for (const tab of ['Library', 'Memorials', 'Kinship', 'Tree']) {
    await openTab(app, tab);
  }
}

test('the open person stays open after visiting the other tabs', async ({
  app,
}) => {
  await treeNode(app, PEOPLE.duc.id).click();
  await expect(panel(app)).toBeVisible();

  await tourTabs(app);

  await expect(panel(app).getByRole('heading', { level: 2 })).toContainText(
    PEOPLE.duc.name,
  );

  await expect(app.getByRole('heading', { level: 1 })).toHaveText(
    'Nguyễn Family Tree',
  );
});

test('a person revealed from another tab stays on the tree', async ({
  app,
}) => {
  // Vân is outside the main house, so the tree has to grow to show her
  await expect(treeNode(app, PEOPLE.van.id)).toBeHidden();

  await openTab(app, 'Library');
  await searchBox(app).fill(PEOPLE.van.name);
  await libraryRows(app).first().click();
  await expect(treeNode(app, PEOPLE.van.id)).toBeVisible();

  await searchBox(app).clear();
  await tourTabs(app);
  await expect(treeNode(app, PEOPLE.van.id)).toBeVisible();
});

test('"Everyone" is kept after visiting the other tabs', async ({ app }) => {
  const everyone = app.getByRole('button', { name: 'Everyone', exact: true });
  await everyone.click();
  await expect(everyone).toHaveAttribute('aria-pressed', 'true');

  await tourTabs(app);
  await expect(everyone).toHaveAttribute('aria-pressed', 'true');
  await expect(treeNode(app, PEOPLE.van.id)).toBeVisible();
});

test('the search box is shared by the Tree and the Library', async ({
  app,
}) => {
  // Starts in the Library: on the Tree, the open dropdown covers the tab bar
  await openTab(app, 'Library');
  await searchBox(app).fill(PEOPLE.van.name);
  await expect(libraryRows(app)).toHaveCount(1);

  // Other tabs keep the text without filtering anything
  await openTab(app, 'Memorials');
  await expect(searchBox(app)).toHaveValue(PEOPLE.van.name);
  await expect(app.getByTestId('search-results')).toBeHidden();
  await expect(app.locator('tbody tr').first()).toBeVisible();

  // The Tree shows the same text as a dropdown of matches
  await openTab(app, 'Tree');

  const results = app.getByTestId('search-results');
  await expect(results).toContainText(PEOPLE.van.name);
  await expect(results.getByRole('button')).toHaveCount(1);
});

test('the kinship pair is kept while browsing other tabs', async ({ app }) => {
  await openTab(app, 'Kinship');
  await pickOption(personSelect(app, 'First person'), option(PEOPLE.an));
  await pickOption(personSelect(app, 'Second person'), option(PEOPLE.duc));
  await expect(app.getByText('An calls Đức')).toBeVisible();

  await tourTabs(app);
  await openTab(app, 'Kinship');

  await expect(personSelect(app, 'First person')).toContainText(
    option(PEOPLE.an),
  );

  await expect(personSelect(app, 'Second person')).toContainText(
    option(PEOPLE.duc),
  );

  await expect(app.getByText('An calls Đức')).toBeVisible();
});

test('a pair picked in compare mode carries over to the Kinship tab', async ({
  app,
}) => {
  await app.locator('main').getByRole('button', { name: 'Kinship' }).click();
  await treeNode(app, PEOPLE.an.id).click();
  await treeNode(app, PEOPLE.duc.id).click();

  // Through the tab bar this time, not the compare bar's "Details"
  await openTab(app, 'Kinship');

  await expect(personSelect(app, 'Second person')).toContainText(
    option(PEOPLE.duc),
  );

  await expect(app.getByText('An calls Đức')).toBeVisible();
});
