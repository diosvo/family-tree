import {
  adminButton,
  expect,
  it,
  loginAsAdmin,
  nav,
  openTab,
  passcodeDialog,
  submitPasscode,
} from './fixtures';

import type { Page } from '@playwright/test';

const suggestionsTab = (app: Page) =>
  nav(app).getByRole('button', { name: /^Suggestions/ });

const addButton = (app: Page) =>
  app.getByRole('button', { name: 'Add', exact: true });

async function expectGuest(app: Page) {
  await expect(adminButton(app)).toBeVisible();
  await expect(suggestionsTab(app)).toBeHidden();
  await expect(addButton(app)).toBeHidden();
}

it('guests see the Admin button but no admin tools', async ({ app }) => {
  await expectGuest(app);
});

it('the passcode dialog hides what is typed and can be cancelled', async ({
  app,
}) => {
  await adminButton(app).click();
  const dialog = passcodeDialog(app);
  const box = dialog.getByLabel('Admin passcode');

  await expect(box).toBeFocused();
  await expect(box).toHaveAttribute('type', 'password');
  await expect(dialog.getByRole('button', { name: 'Sign in' })).toBeDisabled();

  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  await expectGuest(app);

  // Escape closes it too
  await adminButton(app).click();
  await expect(dialog).toBeVisible();
  await app.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

it('a wrong passcode is rejected in the dialog', async ({ app }) => {
  await submitPasscode(app, 'definitely-wrong-passcode');

  const dialog = passcodeDialog(app);
  await expect(dialog.getByRole('alert')).toHaveText('Wrong passcode');

  await expect(dialog.getByLabel('Admin passcode')).toHaveAttribute(
    'aria-invalid',
    'true',
  );

  await app.keyboard.press('Escape');
  await expectGuest(app);
});

it('the right passcode unlocks the admin tools until logout', async ({
  app,
}) => {
  await loginAsAdmin(app);
  await expect(addButton(app)).toBeVisible();

  await openTab(app, /^Suggestions/);
  const label = (await suggestionsTab(app).textContent()) ?? '';

  if (!/\(\d+\)$/.test(label)) {
    await expect(app.getByRole('status')).toContainText(
      'No pending suggestions',
    );
  }

  // The session is a cookie, so it survives a reload
  await app.reload();
  await expect(suggestionsTab(app)).toBeVisible();

  // Clicking Admin again logs out and leaves the admin-only tab
  await openTab(app, /^Suggestions/);
  await adminButton(app).click();
  await expectGuest(app);

  await expect(nav(app).getByRole('button', { name: 'Tree' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

it('"Add" opens the add-person dialog; Escape and the backdrop close it', async ({
  app,
}) => {
  await loginAsAdmin(app);
  await addButton(app).click();

  const dialog = app.getByRole('dialog', { name: 'Add person' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByPlaceholder('Full name *')).toBeVisible();
  await expect(dialog.getByRole('combobox')).toHaveCount(4);

  await expect(
    dialog.getByRole('button', { name: 'Add person' }),
  ).toBeVisible();

  await app.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  // The backdrop covers the whole page; clicking it closes the dialog
  await addButton(app).click();
  await expect(dialog).toBeVisible();
  await app.mouse.click(4, 4);
  await expect(dialog).toBeHidden();
});

it('the admin can download the data as JSON', async ({ app }) => {
  await loginAsAdmin(app);
  await openTab(app, /^Suggestions/);

  const download = app.waitForEvent('download');
  await app.getByRole('button', { name: 'Download data (JSON)' }).click();
  const file = await download;

  expect(file.suggestedFilename()).toMatch(/^family-\d{4}-\d{2}-\d{2}\.json$/);
  const path = await file.path();
  const { readFile } = await import('node:fs/promises');

  const doc = JSON.parse(await readFile(path, 'utf8')) as {
    schemaVersion: number;
    people: unknown[];
  };

  expect(doc.schemaVersion).toBe(1);
  expect(doc.people.length).toBeGreaterThan(0);
});
