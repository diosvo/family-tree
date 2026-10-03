import { afterEach, describe, expect, it, vi } from 'vitest';

import { consumeLastCapturedError, describeError } from './error-capture';

/*
 * Runs in Node, which has no global `addEventListener`; the browser listeners
 * are tested in error-capture.dom.test.ts.
 */

/** `console.error`, kept out of the test output. */
function logQuietly(...args: unknown[]) {
  const write = vi.spyOn(process.stderr, 'write').mockReturnValue(true);

  try {
    console.error(...args);
  } finally {
    write.mockRestore();
  }
}

afterEach(() => {
  vi.useRealTimers();
  consumeLastCapturedError();
});

describe('describeError', () => {
  it('includes the stack, status and causes', () => {
    const root = new Error('disk full');

    const error = Object.assign(new Error('save failed', { cause: root }), {
      status: 503,
    });

    const text = describeError(error);
    expect(text).toContain('Error: save failed');
    expect(text).toContain('(status 503)');
    expect(text).toContain('caused by: Error: disk full');
  });

  it('reads statusCode too, and works without a stack', () => {
    const error = Object.assign(new Error('nope'), { statusCode: 403 });
    error.stack = undefined;
    expect(describeError(error)).toBe('Error: nope (status 403)');
  });

  it('describes causes that are not errors', () => {
    expect(describeError(new Error('a', { cause: 'b' }))).toMatch(/\nb$/);
    expect(describeError({ code: 1 })).toBe('{"code":1}');
    expect(describeError(Symbol.for('x'))).toBe('Symbol(x)');

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(describeError(circular)).toBe('[object Object]');
  });

  it('stops after 5 causes and caps the length', () => {
    let error = new Error('x'.repeat(5000));
    for (let i = 0; i < 10; i++) error = new Error(`${i}`, { cause: error });

    const text = describeError(error);
    expect(text.split('caused by:')).toHaveLength(5);
    expect(text.length).toBeLessThanOrEqual(8000);
  });

  it('describes nothing as nothing', () => {
    expect(describeError(null)).toBe('');
  });
});

describe('console.error capture', () => {
  it('keeps the last logged error briefly, for the error page', () => {
    const error = new Error('boom');
    logQuietly('context', error);
    expect(consumeLastCapturedError()).toBe(error);
    // Consumed once
    expect(consumeLastCapturedError()).toBeUndefined();
  });

  it('forgets an error after 5 seconds', () => {
    vi.useFakeTimers({ now: 0, toFake: ['Date'] });
    logQuietly(new Error('old'));
    vi.setSystemTime(5001);
    expect(consumeLastCapturedError()).toBeUndefined();
  });
});
