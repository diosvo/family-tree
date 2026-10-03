import {
  PEOPLE,
  expect,
  gotoApp,
  it,
  nav,
  openTab,
  panel,
  treeNode,
} from './fixtures';

/*
 * The tab, the selected person and the search text live in the URL, so a
 * link opens the same view and Back returns to the previous one.
 */

const heading = (app: Parameters<typeof panel>[0]) =>
  panel(app).getByRole('heading', { level: 2 });

it('a link to a person opens them, even outside the main tree', async ({
  page,
}) => {
  await gotoApp(page, 'en', `/?person=${PEOPLE.van.id}`);

  await expect(heading(page)).toContainText(PEOPLE.van.name);
  await expect(treeNode(page, PEOPLE.van.id)).toBeVisible();
});

it('a link opens a tab with the search filled in', async ({ page }) => {
  // Not `gotoApp`: it waits for the tree, which the Library does not draw.
  await page.addInitScript(() => localStorage.setItem('ft-lang', 'en'));
  await page.goto('/?tab=library&q=1970');

  await expect(
    nav(page).getByRole('button', { name: 'Library' }),
  ).toHaveAttribute('aria-current', 'page');

  await expect(page.getByRole('textbox', { name: /^Search/ })).toHaveValue(
    '1970',
  );

  await expect(page.locator('tbody tr')).toHaveCount(1);
});

it('an unknown tab or person falls back to the tree', async ({ page }) => {
  await gotoApp(page, 'en', '/?tab=nope&person=nobody');

  await expect(nav(page).getByRole('button', { name: 'Tree' })).toHaveAttribute(
    'aria-current',
    'page',
  );

  await expect(panel(page)).toBeHidden();
});

it('selecting a person and switching tabs update the URL; Back undoes', async ({
  app,
}) => {
  await treeNode(app, PEOPLE.an.id).click();
  await expect(heading(app)).toContainText(PEOPLE.an.name);
  await expect(app).toHaveURL(new RegExp(`person=${PEOPLE.an.id}\\b`));

  await openTab(app, 'Memorials');
  await expect(app).toHaveURL(/tab=memorials/);

  await app.goBack();

  await expect(nav(app).getByRole('button', { name: 'Tree' })).toHaveAttribute(
    'aria-current',
    'page',
  );

  await expect(heading(app)).toContainText(PEOPLE.an.name);
});
