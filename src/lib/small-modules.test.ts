import { describe, expect, it } from 'vitest';

import { errorPageResponse, renderErrorPage } from './error-page';
import { AUTHOR } from './site';
import { btn, btnPrimary, cn, input } from './utils';

describe('error page', () => {
  it('is a 500 HTML page with a way back', async () => {
    const response = errorPageResponse();
    expect(response.status).toBe(500);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(await response.text()).toBe(renderErrorPage());
    expect(renderErrorPage()).toContain('href="/"');
  });
});

describe('utils', () => {
  it('merges class names, later Tailwind classes winning', () => {
    expect(cn('px-2', false, 'px-4', ['text-sm'])).toBe('px-4 text-sm');

    expect(
      [btn, btnPrimary, input].every((c) => c.includes('rounded-md')),
    ).toBe(true);
  });
});

describe('site', () => {
  it('lists the author’s links', () => {
    expect(AUTHOR.links.map((l) => l.kind)).toEqual([
      'github',
      'linkedin',
      'facebook',
    ]);
  });
});
