import {
  PEOPLE,
  expect,
  gate,
  it,
  panel,
  pickOption,
  serverFn,
  test,
  treeNode,
} from './fixtures';

import type { Page } from '@playwright/test';

/*
 * The suggestion form's sending states. Every request is held and then failed
 * here, so nothing is ever saved; the successful path is in
 * admin-writes.spec.ts.
 */

const form = (app: Page) => panel(app).locator('form');
const valueBox = (app: Page) => form(app).getByPlaceholder('New info');

test.beforeEach(async ({ app }) => {
  await treeNode(app, PEOPLE.an.id).click();
  await expect(panel(app)).toBeVisible();
});

it('each field starts from what the person has now', async ({ app }) => {
  const send = form(app).getByRole('button', { name: 'Send suggestion' });
  const field = form(app).getByRole('combobox');

  // Courtesy name is the default field; nothing to send until it changes
  await expect(valueBox(app)).toHaveValue('Phúc Hậu');
  await expect(send).toBeDisabled();
  await valueBox(app).fill('Phúc Đức');
  await expect(send).toBeEnabled();

  await pickOption(field, /^Date of birth/);
  await expect(valueBox(app)).toHaveValue('12/03/1900');
  await pickOption(field, /^Date of death/);
  await expect(valueBox(app)).toHaveValue('10/11/1970');
  await pickOption(field, /^Name$/);
  await expect(valueBox(app)).toHaveValue(PEOPLE.an.name);
  await pickOption(field, 'Other note');
  await expect(valueBox(app)).toHaveValue('');

  // Opening someone else shows their value for the same field
  await pickOption(field, /^Name$/);
  await treeNode(app, PEOPLE.binh.id).click();
  await expect(valueBox(app)).toHaveValue(PEOPLE.binh.name);
});

it('the button is disabled while sending, so a double click sends once', async ({
  app,
}) => {
  const held = gate();
  let requests = 0;

  await app.route(serverFn('addSuggestion'), async (route) => {
    requests++;
    await held.opened;
    await route.abort();
  });

  await valueBox(app).fill('not saved');
  const send = form(app).getByRole('button', { name: 'Send suggestion' });
  await send.dblclick();

  const sending = form(app).getByRole('button', { name: 'Sending…' });
  await expect(sending).toBeDisabled();
  // Enter in the field is ignored too
  await valueBox(app).press('Enter');

  held.open();
  await expect(send).toBeEnabled();
  expect(requests).toBe(1);
});

it('a failed send says so and keeps the text for a retry', async ({ app }) => {
  await app.route(serverFn('addSuggestion'), (route) => route.abort());

  await valueBox(app).fill('keep me');
  await form(app).getByRole('button', { name: 'Send suggestion' }).click();

  await expect(form(app).getByRole('alert')).toHaveText(
    'Could not send — please try again.',
  );

  await expect(valueBox(app)).toHaveValue('keep me');

  await expect(
    form(app).getByRole('button', { name: 'Sent — thank you!' }),
  ).toBeHidden();

  // Editing the text clears the error
  await valueBox(app).fill('keep me, edited');
  await expect(form(app).getByRole('alert')).toBeHidden();
});

it('an empty suggestion is not sent', async ({ app }) => {
  let requests = 0;

  await app.route(serverFn('addSuggestion'), (route) => {
    requests++;

    return route.abort();
  });

  await valueBox(app).fill('   ');
  await form(app).getByRole('button', { name: 'Send suggestion' }).click();

  await expect(
    form(app).getByRole('button', { name: 'Send suggestion' }),
  ).toBeEnabled();

  expect(requests).toBe(0);
});
