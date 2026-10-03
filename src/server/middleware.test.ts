import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SESSION_SECRET, rejectsWith } from '@/test/helpers';
import { runMiddleware as run } from '@/test/start-mock';
import { cookies, setResponseStatus } from '@/test/start-server-mock';

import { HttpError } from './http-error';
import { adminOnly, httpStatus } from './middleware';
import { startAdminSession } from './session';

beforeEach(() => {
  cookies.clear();
  setResponseStatus.mockClear();
  vi.stubEnv('SESSION_SECRET', SESSION_SECRET);
});

describe('httpStatus', () => {
  it('passes results through', async () => {
    await expect(run(httpStatus, async () => 'ok')).resolves.toBe('ok');
    expect(setResponseStatus).not.toHaveBeenCalled();
  });

  it('sets the status of an HttpError and rethrows it', async () => {
    const error = new HttpError(404, 'Unknown person');

    await expect(run(httpStatus, () => Promise.reject(error))).rejects.toBe(
      error,
    );

    expect(setResponseStatus).toHaveBeenCalledWith(404);
  });

  it('leaves other errors alone', async () => {
    await expect(
      run(httpStatus, () => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom');

    expect(setResponseStatus).not.toHaveBeenCalled();
  });
});

describe('adminOnly', () => {
  it('rejects guests with 403', async () => {
    const next = vi.fn(async () => 'ok');
    await rejectsWith(run(adminOnly, next), 403);
    expect(next).not.toHaveBeenCalled();
  });

  it('lets the admin through', async () => {
    startAdminSession();
    await expect(run(adminOnly, async () => 'ok')).resolves.toBe('ok');
  });
});
