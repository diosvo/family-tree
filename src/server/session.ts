import { createHmac, timingSafeEqual } from 'node:crypto';

import {
  deleteCookie,
  getCookie,
  setCookie,
} from '@tanstack/react-start/server';

/*
 * Admin session: a signed, httpOnly cookie holding only an expiry time.
 * The passcode itself is never stored; it lives in ADMIN_PASSCODE on the server.
 */

const COOKIE = 'ft_admin';
const MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const s = process.env.SESSION_SECRET;

  if (!s || s.length < 32) {
    throw new Error('SESSION_SECRET must be set to 32+ characters');
  }

  return s;
}

const sign = (payload: string) =>
  createHmac('sha256', secret()).update(payload).digest('base64url');

/** Constant-time string comparison. */
function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);

  return x.length === y.length && timingSafeEqual(x, y);
}

export function isAdminRequest(): boolean {
  const raw = getCookie(COOKIE);
  if (!raw) return false;

  const [expires, signature] = raw.split('.');
  if (!expires || !signature) return false;
  if (!/^\d+$/.test(expires) || Number(expires) < Date.now()) return false;

  return safeEqual(sign(expires), signature);
}

export function checkPasscode(code: string) {
  const expected = process.env.ADMIN_PASSCODE;

  return !!expected && safeEqual(code, expected);
}

export function startAdminSession() {
  const expires = String(Date.now() + MAX_AGE_S * 1000);

  setCookie(COOKIE, `${expires}.${sign(expires)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_S,
  });
}

export function endAdminSession() {
  deleteCookie(COOKIE, { path: '/' });
}
