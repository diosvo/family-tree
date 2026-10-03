import { test as base, expect } from '@playwright/test';

import type { Locator, Page } from '@playwright/test';

/*
 * Shared setup for the e2e suite. The tests assume the seed data, which the
 * dev server's local file store starts from; see README → Testing.
 */

export type Lang = 'vi' | 'en';

/** Seed people the tests refer to (src/server/seed-data.ts). */
export const PEOPLE = {
  /** Root ancestor of the main house. */
  an: { id: 'p1', name: 'Nguyễn Văn An', year: 1900 },
  /** Wife of An. */
  binh: { id: 'p2', name: 'Trần Thị Bình', year: 1904 },
  /** Eldest son of An. */
  duc: { id: 'p5', name: 'Nguyễn Văn Đức', year: 1925 },
  /** Son of Đức, grandson of An. */
  bao: { id: 'p18', name: 'Nguyễn Văn Bảo', year: 1950 },
  /** Son of Bảo; his children are hidden in the default tree. */
  anh: { id: 'p34', name: 'Nguyễn Văn Anh', year: 1978 },
  /** Son-in-law in a different branch from Toàn: no blood relationship. */
  quang: { id: 'p29', name: 'Đặng Văn Quang', year: 1950 },
  toan: { id: 'p33', name: 'Mai Văn Toàn', year: 1959 },
  /** Outside the main house (Bình's brother's daughter). */
  van: { id: 'p17', name: 'Trần Thị Vân', year: 1935 },
} as const;

type Fixtures = {
  /** UI language stored before the first load; null keeps the app default (vi). */
  lang: Lang | null;
  /** The home page, loaded in `lang`, hydrated and showing the tree. */
  app: Page;
};

export const test = base.extend<Fixtures>({
  lang: ['en', { option: true }],
  app: async ({ page, lang }, provide) => {
    await gotoApp(page, lang);
    await provide(page);
  },
});

/** `test` under its BDD name, for specs that read as `it('…')`. */
export const it = test;

export { expect };

/** Open the app at `url` and wait until React has hydrated and drawn the tree. */
export async function gotoApp(page: Page, lang: Lang | null = 'en', url = '/') {
  if (lang) {
    await page.addInitScript((l) => localStorage.setItem('ft-lang', l), lang);
  }

  await page.goto(url);

  // The canvas is client-only, so seeing it proves hydration and data.
  const canvas = page.locator('.react-flow');

  const empty = page
    .getByRole('status')
    .filter({ hasText: /The family tree is empty|Gia phả chưa có ai/ });

  await expect(canvas.or(empty)).toBeVisible({ timeout: 30_000 });

  if (await empty.isVisible()) {
    throw new Error(
      'The dev server has no people. Delete .data/e2e.json to start again ' +
        'from the seed data.',
    );
  }
}

export const nav = (page: Page) => page.getByRole('navigation');

/** Switch to a main tab by its visible label. */
export async function openTab(page: Page, name: string | RegExp) {
  const tab = nav(page).getByRole('button', { name });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-current', 'page');
}

/** The person panel beside the tree. */
export const panel = (page: Page) => page.getByRole('complementary');

/** A person's card on the tree canvas. */
export const treeNode = (page: Page, id: string) =>
  page.locator(`.react-flow__node[data-id="${id}"]`);

/** The dropdown in the kinship view labelled `label`. */
export const personSelect = (page: Page, label: string) =>
  page.locator('label').filter({ hasText: label }).getByRole('combobox');

/** Choose a person in a dropdown by the "Name (year)" option text. */
export async function pickOption(trigger: Locator, name: string | RegExp) {
  await trigger.click();
  await trigger.page().getByRole('option', { name }).click();
}

/**
 * Click something that opens a native prompt/alert/confirm. The click itself
 * only settles after the dialog is answered, so it is returned unawaited.
 */
export async function clickForDialog(page: Page, target: Locator) {
  const opened = page.waitForEvent('dialog');
  const click = target.click();
  // Avoid an unhandled rejection if the test fails before awaiting the click.
  click.catch(() => {});

  return { dialog: await opened, click };
}

/**
 * Matches requests to one server function in src/server/family.ts, for
 * `page.route`. The URL is `/_serverFn/<id>`, where the id is base64 JSON
 * naming the export (e.g. `addSuggestion_createServerFn_handler`).
 */
export const serverFn = (name: string) => (url: URL) => {
  const [, id] = url.pathname.split('/_serverFn/');

  return !!id && Buffer.from(id, 'base64').toString().includes(`"${name}_`);
};

/** A promise and the function that settles it, to hold a request open. */
export function gate() {
  let open = () => {};
  const opened = new Promise<void>((resolve) => (open = resolve));

  return { opened, open };
}

export const adminButton = (page: Page) =>
  page.getByRole('button', { name: 'Admin', exact: true });

export const passcodeDialog = (page: Page) =>
  page.getByRole('dialog', { name: 'Admin passcode' });

/** Type a passcode in the sign-in dialog, opening it first. */
export async function submitPasscode(page: Page, code: string) {
  const dialog = passcodeDialog(page);
  if (!(await dialog.isVisible())) await adminButton(page).click();
  await dialog.getByLabel('Admin passcode').fill(code);
  await dialog.getByRole('button', { name: 'Sign in' }).click();
}

/** Sign in and wait for the admin tools to appear. */
export async function enterPasscode(page: Page, code: string) {
  await submitPasscode(page, code);
  await expect(passcodeDialog(page)).toBeHidden();

  await expect(
    nav(page).getByRole('button', { name: /^Suggestions/ }),
  ).toBeVisible();
}

/** Log in through the passcode dialog; skips the test when no passcode is set. */
export async function loginAsAdmin(page: Page) {
  const code = process.env.ADMIN_PASSCODE;
  test.skip(!code, 'ADMIN_PASSCODE is not set (see .env / .env.e2e)');
  await enterPasscode(page, code ?? '');
}

/** The VI / EN switch (exact: React Flow's "Fit View" also contains "vi"). */
export const langButton = (page: Page, lang: Lang) =>
  page.getByRole('button', { name: lang.toUpperCase(), exact: true });
