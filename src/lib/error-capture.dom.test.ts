// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { consumeLastCapturedError } from './error-capture';

/* In the browser, uncaught errors and rejections are captured too. */

describe('browser error capture', () => {
  it('keeps uncaught errors', () => {
    const error = new Error('uncaught');
    window.dispatchEvent(new ErrorEvent('error', { error }));
    expect(consumeLastCapturedError()).toBe(error);

    // An error event without an error object keeps the event itself
    const event = new ErrorEvent('error', { message: 'script error' });
    window.dispatchEvent(event);
    expect(consumeLastCapturedError()).toBe(event);
  });

  it('keeps unhandled rejections', () => {
    const event = Object.assign(new Event('unhandledrejection'), {
      reason: 'rejected',
    });

    window.dispatchEvent(event);
    expect(consumeLastCapturedError()).toBe('rejected');
  });
});
