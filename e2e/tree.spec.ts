import {
  PEOPLE,
  expect,
  it,
  nav,
  panel,
  personSelect,
  test,
  treeNode,
} from './fixtures';

import type { Page } from '@playwright/test';

const personNodes = (app: Page) => app.locator('.react-flow__node-person');

it('draws the main house by default', async ({ app }) => {
  await expect(app.locator('.react-flow__viewport')).toBeVisible();
  await expect(treeNode(app, PEOPLE.an.id)).toContainText(PEOPLE.an.name);
  await expect(treeNode(app, PEOPLE.an.id)).toContainText('1900–1970');
  // Relatives outside the main house are not drawn yet
  await expect(treeNode(app, PEOPLE.van.id)).toHaveCount(0);

  await expect(app.getByRole('button', { name: 'Main tree' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await expect(app.getByRole('button', { name: 'Everyone' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});

it('"Everyone" shows the whole family; "Main tree" goes back', async ({
  app,
}) => {
  const before = await personNodes(app).count();

  await app.getByRole('button', { name: 'Everyone' }).click();

  await expect(app.getByRole('button', { name: 'Everyone' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await expect(treeNode(app, PEOPLE.van.id)).toBeVisible();
  expect(await personNodes(app).count()).toBeGreaterThan(before);

  await app.getByRole('button', { name: 'Main tree' }).click();
  await expect(treeNode(app, PEOPLE.van.id)).toHaveCount(0);
  await expect(personNodes(app)).toHaveCount(before);
});

it('a card with hidden children can expand them', async ({ app }) => {
  const before = await personNodes(app).count();

  // Both parents' cards offer the same children; expand from Anh's
  const more = treeNode(app, PEOPLE.anh.id).getByRole('button', {
    name: 'Show 2 more children',
  });

  await more.click();
  await expect(personNodes(app)).toHaveCount(before + 2);
  await expect(more).toHaveCount(0);
  await expect(treeNode(app, 'p46')).toBeVisible();
  await expect(treeNode(app, 'p47')).toBeVisible();
});

it('clicking a card opens the person panel and names the house', async ({
  app,
}) => {
  await treeNode(app, PEOPLE.duc.id).click();

  const heading = panel(app).getByRole('heading', { level: 2 });
  await expect(heading).toContainText(PEOPLE.duc.name);
  await expect(heading).toContainText('(Minh Đức)');
  await expect(panel(app)).toContainText('Male · 1925–1995');

  await expect(panel(app)).toContainText(
    /Memorial \d{1,2} [A-Z][a-z]{2} \(lunar\)/,
  );

  await expect(app.getByRole('heading', { level: 1 })).toHaveText(
    'Nguyễn Family Tree',
  );

  await panel(app).getByRole('button', { name: 'Close' }).click();
  await expect(panel(app)).toBeHidden();

  await expect(app.getByRole('heading', { level: 1 })).toHaveText(
    'Family Tree',
  );
});

it('the panel lists relatives and navigates between them', async ({ app }) => {
  await treeNode(app, PEOPLE.duc.id).click();
  const p = panel(app);
  const heading = p.getByRole('heading', { level: 2 });

  await expect(p.getByText('Parents', { exact: true })).toBeVisible();
  await expect(p.getByText('Spouse', { exact: true })).toBeVisible();
  await expect(p.getByText('Siblings', { exact: true })).toBeVisible();
  await expect(p.getByText('Children', { exact: true })).toBeVisible();

  await p.getByRole('button', { name: PEOPLE.an.name, exact: true }).click();
  await expect(heading).toContainText(PEOPLE.an.name);

  await p.getByRole('button', { name: PEOPLE.duc.name, exact: true }).click();
  await expect(heading).toContainText(PEOPLE.duc.name);
});

it('"Kinship with…" opens the kinship view with the person preselected', async ({
  app,
}) => {
  await treeNode(app, PEOPLE.an.id).click();
  await panel(app).getByRole('button', { name: 'Kinship with…' }).click();

  await expect(
    nav(app).getByRole('button', { name: 'Kinship' }),
  ).toHaveAttribute('aria-current', 'page');

  await expect(personSelect(app, 'First person')).toContainText(
    `${PEOPLE.an.name} (${PEOPLE.an.year})`,
  );

  await expect(personSelect(app, 'Second person')).toContainText(
    'Choose a person',
  );
});

test.describe('compare mode', () => {
  const compareButton = (app: Page) =>
    app.locator('main').getByRole('button', { name: 'Kinship' });

  it('picks two cards, shows how they are related, and opens the details', async ({
    app,
  }) => {
    await expect(compareButton(app)).toHaveAttribute('aria-pressed', 'false');
    await compareButton(app).click();
    await expect(compareButton(app)).toHaveAttribute('aria-pressed', 'true');
    await expect(app.getByText('Tap two people in the tree')).toBeVisible();

    await treeNode(app, PEOPLE.an.id).click();
    // Picking fills the compare bar instead of opening the panel
    await expect(panel(app)).toBeHidden();
    await treeNode(app, PEOPLE.duc.id).click();

    const main = app.locator('main');
    await expect(main).toContainText('Đức is An’s son (con trai)');
    await expect(main).toContainText('An → Đức: con');
    await expect(main).toContainText('Đức → An: ba');

    await app.getByRole('button', { name: 'Details' }).click();

    await expect(
      nav(app).getByRole('button', { name: 'Kinship' }),
    ).toHaveAttribute('aria-current', 'page');

    await expect(personSelect(app, 'First person')).toContainText(
      `${PEOPLE.an.name} (${PEOPLE.an.year})`,
    );

    await expect(personSelect(app, 'Second person')).toContainText(
      `${PEOPLE.duc.name} (${PEOPLE.duc.year})`,
    );
  });

  it('"Clear" empties the pair and the close button leaves compare mode', async ({
    app,
  }) => {
    await compareButton(app).click();
    await treeNode(app, PEOPLE.an.id).click();
    await treeNode(app, PEOPLE.duc.id).click();
    await expect(app.getByRole('button', { name: 'Details' })).toBeVisible();

    await app.getByRole('button', { name: 'Clear' }).click();
    await expect(app.getByText('Tap two people in the tree')).toBeVisible();
    await expect(app.getByRole('button', { name: 'Details' })).toBeHidden();

    await app.getByRole('button', { name: 'Close' }).click();
    await expect(compareButton(app)).toHaveAttribute('aria-pressed', 'false');
    await expect(app.getByText('Tap two people in the tree')).toBeHidden();
  });
});

test.describe('search', () => {
  const box = (app: Page) => app.getByRole('textbox', { name: /^Search name/ });

  const results = (app: Page) => app.getByTestId('search-results');

  it('matches name, courtesy name or birth year, ignoring accents', async ({
    app,
  }) => {
    await expect(box(app)).toBeVisible();
    await expect(results(app)).toBeHidden();

    await box(app).fill('Phúc Hậu');

    await expect(results(app).getByRole('button')).toHaveText([
      'Nguyễn Văn An 1900',
    ]);

    await box(app).fill('duc');

    await expect(
      results(app).getByRole('button', { name: PEOPLE.duc.name }),
    ).toBeVisible();

    await box(app).fill('1904');

    await expect(results(app).getByRole('button')).toHaveText([
      'Trần Thị Bình 1904',
    ]);
  });

  it('says "No match" for an unknown term and hides when cleared', async ({
    app,
  }) => {
    await box(app).fill('zzz-nobody');
    await expect(results(app)).toContainText('No match');

    await box(app).clear();
    await expect(results(app)).toBeHidden();
  });

  it('choosing a result reveals the person on the tree and opens the panel', async ({
    app,
  }) => {
    await expect(treeNode(app, PEOPLE.van.id)).toHaveCount(0);

    await box(app).fill(PEOPLE.van.name);

    await results(app).getByRole('button', { name: PEOPLE.van.name }).click();

    await expect(box(app)).toHaveValue('');
    await expect(results(app)).toBeHidden();
    await expect(treeNode(app, PEOPLE.van.id)).toBeVisible();

    await expect(panel(app).getByRole('heading', { level: 2 })).toContainText(
      PEOPLE.van.name,
    );

    await expect(app.getByRole('heading', { level: 1 })).toHaveText(
      'Trần Family Tree',
    );

    // The tree is now a custom selection: neither preset scope is active
    await expect(
      app.getByRole('button', { name: 'Main tree' }),
    ).toHaveAttribute('aria-pressed', 'false');

    await expect(app.getByRole('button', { name: 'Everyone' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('the dropdown only appears on the Tree tab', async ({ app }) => {
    await nav(app).getByRole('button', { name: 'Library' }).click();
    await box(app).fill('1900');
    await expect(results(app)).toBeHidden();
  });
});
