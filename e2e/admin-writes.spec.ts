import {
  PEOPLE,
  clickForDialog,
  enterPasscode,
  expect,
  gate,
  gotoApp,
  it,
  loginAsAdmin,
  openTab,
  panel,
  personSelect,
  pickOption,
  serverFn,
  test,
} from './fixtures';

import type { Page } from '@playwright/test';

/*
 * Flows that change data: adding and removing a person, sending and
 * resolving suggestions. They clean up after themselves but must never run
 * against production, so they are opt-in: E2E_WRITES=1 npm run test:e2e
 */
test.skip(
  process.env.E2E_WRITES !== '1',
  'Set E2E_WRITES=1 to run the tests that change data',
);

test.describe.configure({ mode: 'serial' });

const NAME = `E2E Test Person ${Date.now().toString(36)}`;
const FATHER = PEOPLE.anh;

const searchBox = (app: Page) => app.getByRole('textbox', { name: /^Search/ });

/** Open the test person's panel from the search box. */
async function openTestPerson(app: Page) {
  await openTab(app, 'Tree');
  await searchBox(app).fill(NAME);

  await app
    .getByTestId('search-results')
    .getByRole('button', { name: NAME })
    .click();

  await expect(panel(app).getByRole('heading', { level: 2 })).toContainText(
    NAME,
  );
}

/** The Library row of the test person (search for NAME first). */
const libraryRow = (app: Page) =>
  app.locator('tbody tr').filter({ hasText: NAME });

/** A suggestion row for the test person in the admin inbox. */
const suggestionRow = (app: Page, text: string | RegExp) =>
  app
    .locator('section')
    .filter({ hasText: NAME })
    .locator('div')
    .filter({ hasText: text })
    .filter({ has: app.getByRole('button', { name: 'Accept' }) })
    .last();

/** Send a suggestion from the open panel. */
async function suggest(
  app: Page,
  field: string | RegExp | null,
  value: string,
) {
  const form = panel(app).locator('form');
  if (field) await pickOption(form.getByRole('combobox'), field);
  await form.getByPlaceholder('New info').fill(value);
  await form.getByPlaceholder('Your name (optional)').fill('Playwright');
  await form.getByRole('button', { name: 'Send suggestion' }).click();

  await expect(
    form.getByRole('button', { name: 'Sent — thank you!' }),
  ).toBeVisible();
}

it('an admin can add a person with a father', async ({ app }) => {
  await loginAsAdmin(app);
  await app.getByRole('button', { name: 'Add', exact: true }).click();

  const dialog = app.getByRole('dialog', { name: 'Add person' });
  await dialog.getByPlaceholder('Full name *').fill(NAME);
  await dialog.getByPlaceholder(/^Born, solar/).fill('1999');

  await pickOption(
    dialog.getByRole('combobox').filter({ hasText: 'Father' }),
    `${FATHER.name} (${FATHER.year})`,
  );

  await dialog.getByRole('button', { name: 'Add person' }).click();
  await expect(dialog).toBeHidden();

  await openTestPerson(app);
  await expect(panel(app)).toContainText('Male · 1999');

  await expect(
    panel(app).getByRole('button', { name: FATHER.name, exact: true }),
  ).toBeVisible();
});

it('the new person appears in the Library and Kinship views', async ({
  app,
}) => {
  await openTab(app, 'Library');
  await searchBox(app).fill(NAME);
  await expect(libraryRow(app)).toContainText('1999');

  await searchBox(app).clear();
  await openTab(app, 'Kinship');
  await pickOption(personSelect(app, 'First person'), `${NAME} (1999)`);

  await pickOption(
    personSelect(app, 'Second person'),
    `${FATHER.name} (${FATHER.year})`,
  );

  await expect(
    app.getByText(`${FATHER.name} is ${NAME}’s father (ba)`),
  ).toBeVisible();
});

it('an admin can edit a person', async ({ app }) => {
  await loginAsAdmin(app);
  await openTestPerson(app);
  await panel(app).getByRole('button', { name: 'Edit' }).click();

  const dialog = app.getByRole('dialog', { name: `Edit: ${NAME}` });
  // The form starts from the saved details
  await expect(dialog.getByPlaceholder('Full name *')).toHaveValue(NAME);
  await expect(dialog.getByPlaceholder(/^Born, solar/)).toHaveValue('1999');

  await expect(
    dialog.getByRole('combobox').filter({ hasText: FATHER.name }),
  ).toBeVisible();

  await dialog.getByPlaceholder(/^Died, solar/).fill('1/2/2020');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toBeHidden();

  await expect(panel(app)).toContainText('Male · 1999–2020');
});

it('a suggestion reaches the admin inbox and can be accepted', async ({
  app,
}) => {
  await loginAsAdmin(app);
  await openTestPerson(app);
  // "Courtesy name" is the default field
  await suggest(app, null, 'E2E Courtesy');

  await openTab(app, /^Suggestions \(\d+\)$/);
  const group = app.locator('section').filter({ hasText: NAME });

  const row = group
    .locator('div')
    .filter({ hasText: 'Courtesy name: E2E Courtesy' })
    .filter({ hasText: 'by Playwright' })
    .first();

  await expect(row).toBeVisible();

  await row.getByRole('button', { name: 'Accept' }).click();
  await expect(row).toBeHidden();

  await openTestPerson(app);

  await expect(panel(app).getByRole('heading', { level: 2 })).toContainText(
    '(E2E Courtesy)',
  );
});

it('a suggestion can be dismissed without changing the person', async ({
  app,
}) => {
  await loginAsAdmin(app);
  await openTestPerson(app);
  await suggest(app, 'Other note', 'ignore me please');

  await openTab(app, /^Suggestions \(\d+\)$/);
  const group = app.locator('section').filter({ hasText: NAME });

  const row = group
    .locator('div')
    .filter({ hasText: 'Other note: ignore me please' })
    .first();

  await expect(row).toBeVisible();

  await row.getByRole('button', { name: 'Dismiss' }).click();
  await expect(row).toBeHidden();

  await openTestPerson(app);
  await expect(panel(app)).not.toContainText('ignore me please');
});

it("a guest's suggestion reaches the admin in another session", async ({
  app,
  browser,
}) => {
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await gotoApp(guest);
  await openTestPerson(guest);
  await suggest(guest, 'Other note', 'from a guest');
  await guestContext.close();

  // The admin's page loaded before the guest sent; logging in fetches it
  await loginAsAdmin(app);
  await openTab(app, /^Suggestions \(\d+\)$/);

  const row = suggestionRow(app, 'Other note: from a guest').filter({
    hasText: 'by Playwright',
  });

  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Dismiss' }).click();
  await expect(row).toBeHidden();
});

it('Accept and Dismiss are disabled while resolving; the Library updates', async ({
  app,
}) => {
  await loginAsAdmin(app);
  await openTestPerson(app);
  await suggest(app, /^Date of birth/, '2001');
  await openTab(app, /^Suggestions \(\d+\)$/);

  const held = gate();
  let requests = 0;

  await app.route(serverFn('resolveSuggestion'), async (route) => {
    requests++;
    await held.opened;
    await route.continue();
  });

  const row = suggestionRow(app, /Date of birth.*: 2001/);
  const accept = row.getByRole('button', { name: 'Accept' });
  const dismiss = row.getByRole('button', { name: 'Dismiss' });

  await accept.click();
  await expect(accept).toBeDisabled();
  await expect(dismiss).toBeDisabled();
  // Forced clicks on a disabled button do nothing
  await accept.click({ force: true });
  await dismiss.click({ force: true });

  held.open();
  await expect(row).toBeHidden();
  expect(requests).toBe(1);

  await app.unroute(serverFn('resolveSuggestion'));
  await openTab(app, 'Library');
  await searchBox(app).fill(NAME);
  await expect(libraryRow(app)).toContainText('2001');
  await expect(libraryRow(app)).not.toContainText('1999');
});

it('an admin can remove a person after confirming', async ({ app }) => {
  await loginAsAdmin(app);
  await openTestPerson(app);

  const { dialog, click } = await clickForDialog(
    app,
    panel(app).getByRole('button', { name: 'Remove person' }),
  );

  expect(dialog.type()).toBe('confirm');
  expect(dialog.message()).toBe(`Remove ${NAME}?`);
  await dialog.accept();
  await click;

  await expect(panel(app)).toBeHidden();
  await searchBox(app).fill(NAME);
  await expect(app.getByTestId('search-results')).toContainText('No match');
});

// Safety net: if a test above failed, do not leave the test person behind.
test.afterAll(async ({ browser }) => {
  const code = process.env.ADMIN_PASSCODE;
  if (process.env.E2E_WRITES !== '1' || !code) return;

  const page = await browser.newPage();
  await gotoApp(page);
  await enterPasscode(page, code);
  await searchBox(page).fill(NAME);

  const results = page.getByTestId('search-results');
  await expect(results).toBeVisible();
  const hit = results.getByRole('button', { name: NAME });

  if (await hit.isVisible()) {
    await hit.click();
    page.once('dialog', (d) => void d.accept());
    await panel(page).getByRole('button', { name: 'Remove person' }).click();
    await expect(panel(page)).toBeHidden();
  }

  await page.close();
});
