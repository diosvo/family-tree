import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SESSION_SECRET as SECRET } from '@/test/helpers';
import { cookies, lastCookieOptions } from '@/test/start-server-mock';

import {
  checkPasscode,
  endAdminSession,
  isAdminRequest,
  startAdminSession,
} from './session';

beforeEach(() => {
  cookies.clear();
  vi.stubEnv('SESSION_SECRET', SECRET);
  vi.stubEnv('ADMIN_PASSCODE', 'open sesame');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('checkPasscode', () => {
  it('accepts only the configured passcode', () => {
    expect(checkPasscode('open sesame')).toBe(true);
    expect(checkPasscode('open sesamE')).toBe(false);
    expect(checkPasscode('short')).toBe(false);
  });

  it('accepts nothing when no passcode is configured', () => {
    vi.stubEnv('ADMIN_PASSCODE', '');
    expect(checkPasscode('')).toBe(false);
  });
});

describe('admin session', () => {
  it('signs in with a signed cookie, and out again', () => {
    expect(isAdminRequest()).toBe(false);

    startAdminSession();
    expect(isAdminRequest()).toBe(true);

    expect(lastCookieOptions.value).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
    });

    endAdminSession();
    expect(isAdminRequest()).toBe(false);
  });

  it('sends the cookie over HTTPS only in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    startAdminSession();
    expect(lastCookieOptions.value).toMatchObject({ secure: true });
  });

  it('expires after 30 days', () => {
    vi.useFakeTimers({ now: new Date('2026-01-01') });
    startAdminSession();
    vi.setSystemTime(new Date('2026-02-01'));
    expect(isAdminRequest()).toBe(false);
  });

  it.each([
    ['no signature', '123'],
    ['no expiry', '.abc'],
    ['a non-numeric expiry', 'soon.abc'],
    ['a forged signature', `${Date.now() + 60_000}.forged`],
  ])('rejects a cookie with %s', (_, value) => {
    cookies.set('ft_admin', value);
    expect(isAdminRequest()).toBe(false);
  });

  it('rejects a cookie signed with another secret', () => {
    startAdminSession();
    vi.stubEnv('SESSION_SECRET', `${SECRET}-rotated`);
    expect(isAdminRequest()).toBe(false);
  });

  it('needs a long enough secret', () => {
    cookies.set('ft_admin', `${Date.now() + 60_000}.sig`);
    vi.stubEnv('SESSION_SECRET', 'too-short');
    expect(() => isAdminRequest()).toThrow('SESSION_SECRET');
    vi.stubEnv('SESSION_SECRET', '');
    expect(() => startAdminSession()).toThrow('SESSION_SECRET');
  });
});
