import { expect, it, langButton, nav, test } from './fixtures';

const EN_TABS = ['Tree', 'Library', 'Memorials', 'Kinship'];
const VI_TABS = ['Cây gia phả', 'Danh sách', 'Ngày giỗ', 'Xưng hô'];

test.describe('page shell', () => {
  it('has the page title', async ({ app }) => {
    await expect(app).toHaveTitle('Gia Phả — Family Tree');
  });

  it('shows "Family Tree" and the four tabs, with Tree active', async ({
    app,
  }) => {
    await expect(app.getByRole('heading', { level: 1 })).toHaveText(
      'Family Tree',
    );

    const tabs = nav(app).getByRole('button');
    await expect(tabs).toHaveText(EN_TABS);
    await expect(tabs.first()).toHaveAttribute('aria-current', 'page');
    await expect(tabs.nth(1)).not.toHaveAttribute('aria-current', 'page');
  });

  it('footer links open in a new tab', async ({ app }) => {
    const footer = app.getByRole('contentinfo');
    await expect(footer).toContainText('Made with');

    const github = footer.getByRole('link', { name: 'Github' });
    await expect(github).toHaveAttribute('href', /github\.com/);
    await expect(github).toHaveAttribute('target', '_blank');
    await expect(github).toHaveAttribute('rel', 'noreferrer');
  });

  it('unknown routes show the 404 page with a way home', async ({ page }) => {
    await page.goto('/does-not-exist');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    await expect(page.getByText('Page not found')).toBeVisible();

    await page.getByRole('link', { name: 'Go home' }).click();
    await expect(page).toHaveURL('/');
    await expect(nav(page)).toBeVisible();
  });
});

test.describe('language', () => {
  it('switches to Vietnamese and back', async ({ app }) => {
    const html = app.locator('html');
    await expect(html).toHaveAttribute('lang', 'en');

    await langButton(app, 'vi').click();
    await expect(html).toHaveAttribute('lang', 'vi');
    await expect(nav(app).getByRole('button')).toHaveText(VI_TABS);
    await expect(app.getByRole('heading', { level: 1 })).toHaveText('Gia Phả');

    await expect(langButton(app, 'vi')).toHaveAttribute('aria-pressed', 'true');

    await langButton(app, 'en').click();
    await expect(html).toHaveAttribute('lang', 'en');
    await expect(nav(app).getByRole('button')).toHaveText(EN_TABS);
  });

  test.describe('without a stored choice', () => {
    test.use({ lang: null });

    it('defaults to Vietnamese', async ({ app }) => {
      await expect(app.locator('html')).toHaveAttribute('lang', 'vi');
      await expect(nav(app).getByRole('button')).toHaveText(VI_TABS);

      await expect(langButton(app, 'vi')).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });

    it('remembers the choice across reloads', async ({ app }) => {
      await langButton(app, 'en').click();
      await expect(nav(app).getByRole('button')).toHaveText(EN_TABS);

      await app.reload();
      await expect(nav(app).getByRole('button')).toHaveText(EN_TABS);
      await expect(app.locator('html')).toHaveAttribute('lang', 'en');
    });
  });
});

test.describe('theme', () => {
  test.use({ colorScheme: 'light' });

  it('cycles light → dark → system and is remembered', async ({ app }) => {
    const html = app.locator('html');
    const toggle = app.getByRole('button', { name: /^Theme:/ });

    await expect(toggle).toHaveAccessibleName('Theme: System');
    await expect(html).not.toHaveClass(/dark/);

    await toggle.click();
    await expect(toggle).toHaveAccessibleName('Theme: Light');
    await expect(html).not.toHaveClass(/dark/);

    await toggle.click();
    await expect(toggle).toHaveAccessibleName('Theme: Dark');
    await expect(html).toHaveClass(/dark/);

    // The head script restores the saved theme before React loads
    await app.reload();
    await expect(html).toHaveClass(/dark/);
    await expect(toggle).toHaveAccessibleName('Theme: Dark');

    await toggle.click();
    await expect(toggle).toHaveAccessibleName('Theme: System');
    await expect(html).not.toHaveClass(/dark/);
  });

  it('"System" follows the operating system preference', async ({ app }) => {
    await expect(app.locator('html')).not.toHaveClass(/dark/);
    await app.emulateMedia({ colorScheme: 'dark' });
    await expect(app.locator('html')).toHaveClass(/dark/);
  });
});
