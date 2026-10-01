import {
  adminButton,
  clickForDialog,
  expect,
  loginAsAdmin,
  nav,
  openTab,
  test,
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

test('guests see the Admin button but no admin tools', async ({ app }) => {
  await expectGuest(app);
});

test('the passcode prompt can be cancelled', async ({ app }) => {
  const { dialog, click } = await clickForDialog(app, adminButton(app));
  expect(dialog.type()).toBe('prompt');
  expect(dialog.message()).toBe('Admin passcode');

  await dialog.dismiss();
  await click;
  await expectGuest(app);
});

test('a wrong passcode is rejected with an alert', async ({ app }) => {
  const { dialog: prompt, click } = await clickForDialog(app, adminButton(app));
  // Listen for the alert before answering the prompt so it is not missed
  const alerted = app.waitForEvent('dialog');
  await prompt.accept('definitely-wrong-passcode');

  const alert = await alerted;
  expect(alert.type()).toBe('alert');
  expect(alert.message()).toBe('Wrong passcode');
  await alert.dismiss();
  await click;

  await expectGuest(app);
});

test('the right passcode unlocks the admin tools until logout', async ({
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

test('"Add" opens the add-person dialog; the backdrop closes it', async ({
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

  // The backdrop covers the whole page; clicking it closes the dialog
  await app.mouse.click(4, 4);
  await expect(dialog).toBeHidden();
});
