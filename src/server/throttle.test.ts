import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  MAX_FAILURES,
  WINDOW_MS,
  createThrottle,
  loginThrottle,
} from './throttle';

/** Record `times` failed logins for `client`. */
function failTimes(
  throttle: { fail: (client: string) => void },
  client: string,
  times = MAX_FAILURES,
) {
  for (let i = 0; i < times; i++) throttle.fail(client);
}

describe('createThrottle', () => {
  it(`locks a client after ${MAX_FAILURES} failures, for that client only`, () => {
    const throttle = createThrottle(() => 0);

    failTimes(throttle, 'a', MAX_FAILURES - 1);
    expect(throttle.locked('a')).toBe(false);

    throttle.fail('a');
    expect(throttle.locked('a')).toBe(true);
    expect(throttle.locked('b')).toBe(false);
  });

  it('unlocks once the window has passed', () => {
    let now = 0;
    const throttle = createThrottle(() => now);

    failTimes(throttle, 'a');
    now = WINDOW_MS - 1;
    expect(throttle.locked('a')).toBe(true);
    now = WINDOW_MS;
    expect(throttle.locked('a')).toBe(false);
  });

  it('forgets failures after a successful login', () => {
    const throttle = createThrottle(() => 0);

    failTimes(throttle, 'a');
    throttle.clear('a');
    expect(throttle.locked('a')).toBe(false);
  });
});

describe('loginThrottle', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    loginThrottle.clear('client');
  });

  it('uses the clock and locks after too many failures', () => {
    failTimes(loginThrottle, 'client');
    expect(loginThrottle.locked('client')).toBe(true);
  });

  it('never locks when turned off for the e2e server', () => {
    vi.stubEnv('LOGIN_THROTTLE', 'off');
    failTimes(loginThrottle, 'client');
    expect(loginThrottle.locked('client')).toBe(false);
  });
});
