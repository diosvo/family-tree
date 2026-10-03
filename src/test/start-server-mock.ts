import { vi } from 'vitest';

/*
 * Stand-in for `@tanstack/react-start/server` in unit tests: one client's
 * cookies, its address and the response status, all inspectable.
 * Aliased in vitest.config.ts.
 */

export const cookies = new Map<string, string>();

/** Options of the last `setCookie` call. */
export const lastCookieOptions: { value?: Record<string, unknown> } = {};

export const getCookie = (name: string) => cookies.get(name);

export function setCookie(
  name: string,
  value: string,
  options?: Record<string, unknown>,
) {
  cookies.set(name, value);
  lastCookieOptions.value = options;
}

export const deleteCookie = (name: string) => void cookies.delete(name);

export const getRequestIP = vi.fn<() => string | undefined>(() => '127.0.0.1');

export const setResponseStatus = vi.fn<(code: number) => void>();
