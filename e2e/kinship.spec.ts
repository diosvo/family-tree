import {
  PEOPLE,
  expect,
  it,
  langButton,
  nav,
  openTab,
  panel,
  personSelect,
  pickOption,
  test,
} from './fixtures';

import type { Page } from '@playwright/test';

const option = (p: { name: string; year: number }) => `${p.name} (${p.year})`;

const NO_RELATION = 'No family relationship found between these two people.';

async function pickPair(
  app: Page,
  a: { name: string; year: number },
  b: { name: string; year: number },
) {
  await pickOption(personSelect(app, 'First person'), option(a));
  await pickOption(personSelect(app, 'Second person'), option(b));
}

/** A term of address shown in one of the two "X calls Y" cards. */
const term = (app: Page, word: string) => app.getByText(word, { exact: true });

test.beforeEach(async ({ app }) => {
  await openTab(app, 'Kinship');
});

it('starts with two empty pickers, a swap button and the region switch', async ({
  app,
}) => {
  await expect(app.locator('.react-flow')).toBeHidden();
  await expect(app.getByText('First person')).toBeVisible();
  await expect(app.getByText('Second person')).toBeVisible();

  await expect(personSelect(app, 'First person')).toContainText(
    'Choose a person',
  );

  await expect(personSelect(app, 'Second person')).toContainText(
    'Choose a person',
  );

  await expect(app.getByRole('button', { name: 'Swap' })).toBeVisible();

  await expect(app.getByRole('button', { name: 'Southern' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await expect(app.getByRole('button', { name: 'Northern' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );

  // Nothing to say until both people are chosen
  await expect(app.getByText(NO_RELATION)).toBeHidden();
  await expect(app.getByText(/ calls /)).toBeHidden();
});

it('nothing is shown while only one person is chosen', async ({ app }) => {
  await pickOption(personSelect(app, 'First person'), option(PEOPLE.an));

  await expect(personSelect(app, 'First person')).toContainText(
    option(PEOPLE.an),
  );

  await expect(app.getByText(NO_RELATION)).toBeHidden();
  await expect(app.getByText(/ calls /)).toBeHidden();
});

it('describes a parent and child in both directions, and can swap them', async ({
  app,
}) => {
  await pickPair(app, PEOPLE.an, PEOPLE.duc);

  await expect(
    app.getByText('Nguyễn Văn Đức is Nguyễn Văn An’s son (con trai)'),
  ).toBeVisible();

  await expect(app.getByText('An calls Đức')).toBeVisible();
  await expect(term(app, 'con')).toBeVisible();
  await expect(app.getByText('Đức calls An')).toBeVisible();
  await expect(term(app, 'ba')).toBeVisible();

  await expect(
    app.getByText('Terms of address vary between families and regions.'),
  ).toBeVisible();

  await app.getByRole('button', { name: 'Swap' }).click();

  await expect(personSelect(app, 'First person')).toContainText(
    option(PEOPLE.duc),
  );

  await expect(personSelect(app, 'Second person')).toContainText(
    option(PEOPLE.an),
  );

  await expect(
    app.getByText('Nguyễn Văn An is Nguyễn Văn Đức’s father (ba)'),
  ).toBeVisible();
});

it('Northern terms replace Southern ones and the choice is remembered', async ({
  app,
}) => {
  await pickPair(app, PEOPLE.an, PEOPLE.duc);
  await expect(term(app, 'ba')).toBeVisible();

  await app.getByRole('button', { name: 'Northern' }).click();

  await expect(app.getByRole('button', { name: 'Northern' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await expect(term(app, 'bố')).toBeVisible();
  await expect(term(app, 'ba')).toBeHidden();

  // The relationship itself does not change with the region
  await expect(
    app.getByText('Nguyễn Văn Đức is Nguyễn Văn An’s son (con trai)'),
  ).toBeVisible();

  await app.reload();
  await openTab(app, 'Kinship');

  await expect(app.getByRole('button', { name: 'Northern' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

it('recognises spouses', async ({ app }) => {
  await pickPair(app, PEOPLE.an, PEOPLE.binh);

  await expect(
    app.getByText('Trần Thị Bình is Nguyễn Văn An’s wife (vợ)'),
  ).toBeVisible();
});

it('reports when two people are not related', async ({ app }) => {
  await pickPair(app, PEOPLE.quang, PEOPLE.toan);
  await expect(app.getByText(NO_RELATION)).toBeVisible();
  await expect(app.getByText(/ calls /)).toBeHidden();
});

it('shows the path of an indirect relationship and jumps to people on it', async ({
  app,
}) => {
  await pickPair(app, PEOPLE.an, PEOPLE.bao);

  await expect(
    app.getByText(
      "Nguyễn Văn Bảo is Nguyễn Văn An’s grandson (son's child) (cháu nội)",
    ),
  ).toBeVisible();

  await expect(term(app, 'cháu')).toBeVisible();
  await expect(term(app, 'ông nội')).toBeVisible();

  const path = app.getByText('Path:').locator('..');

  await expect(path).toContainText(
    'Nguyễn Văn An → Nguyễn Văn Đức → Nguyễn Văn Bảo',
  );

  await path
    .getByRole('button', { name: PEOPLE.duc.name, exact: true })
    .click();

  await expect(nav(app).getByRole('button', { name: 'Tree' })).toHaveAttribute(
    'aria-current',
    'page',
  );

  await expect(panel(app).getByRole('heading', { level: 2 })).toContainText(
    PEOPLE.duc.name,
  );
});

it('the person cards open the person on the tree', async ({ app }) => {
  await pickPair(app, PEOPLE.an, PEOPLE.duc);

  await app.getByRole('button', { name: 'Nguyễn Văn Đức (Minh Đức)' }).click();

  await expect(nav(app).getByRole('button', { name: 'Tree' })).toHaveAttribute(
    'aria-current',
    'page',
  );

  await expect(panel(app).getByRole('heading', { level: 2 })).toContainText(
    PEOPLE.duc.name,
  );
});

it('Vietnamese puts the relationship first', async ({ app }) => {
  await pickPair(app, PEOPLE.an, PEOPLE.duc);
  await langButton(app, 'vi').click();

  await expect(
    app.getByText('Nguyễn Văn Đức là con trai của Nguyễn Văn An'),
  ).toBeVisible();

  await expect(app.getByText('An gọi Đức là')).toBeVisible();

  await expect(app.getByRole('button', { name: 'Miền Nam' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
