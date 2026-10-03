/*
 * Failed-login throttle, kept in memory. Each server instance counts on its
 * own, so on a serverless host this slows guessing down rather than capping it
 * exactly; together with the delay after each wrong passcode it makes
 * brute-forcing a reasonable passcode impractical.
 */

/** Wrong passcodes allowed per client within `WINDOW_MS`. */
export const MAX_FAILURES = 5;
export const WINDOW_MS = 15 * 60 * 1000;

type Entry = { failures: number; resetAt: number };

export function createThrottle(now = () => Date.now()) {
  const entries = new Map<string, Entry>();

  const current = (key: string) => {
    const e = entries.get(key);
    if (e && e.resetAt <= now()) entries.delete(key);

    return entries.get(key);
  };

  return {
    /** Whether `key` has used up its attempts for now. */
    locked: (key: string) => (current(key)?.failures ?? 0) >= MAX_FAILURES,
    fail: (key: string) => {
      const e = current(key) ?? { failures: 0, resetAt: now() + WINDOW_MS };
      e.failures++;
      entries.set(key, e);
    },
    clear: (key: string) => void entries.delete(key),
  };
}

/** Off only for the e2e dev server, whose tests all come from one address. */
const disabled = () => process.env.LOGIN_THROTTLE === 'off';

const shared = createThrottle();

export const loginThrottle: ReturnType<typeof createThrottle> = {
  locked: (key) => !disabled() && shared.locked(key),
  fail: (key) => shared.fail(key),
  clear: (key) => shared.clear(key),
};
