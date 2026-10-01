import {
  PEOPLE,
  expect,
  gate,
  panel,
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

test('the button is disabled while sending, so a double click sends once', async ({
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

test('a failed send says so and keeps the text for a retry', async ({
  app,
}) => {
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

test('an empty suggestion is not sent', async ({ app }) => {
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
