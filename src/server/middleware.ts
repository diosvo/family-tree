import { createMiddleware } from '@tanstack/react-start';

import { HttpError, reject } from './http-error';

/*
 * Function middleware is referenced from server-function definitions, which the
 * client bundle keeps, so this file imports server-only modules lazily inside
 * the `.server()` callbacks (those are stripped from the client build).
 */

/** Gives an `HttpError` thrown by a validator or handler its status code. */
export const httpStatus = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    try {
      return await next();
    } catch (error) {
      if (error instanceof HttpError) {
        const { setResponseStatus } =
          await import('@tanstack/react-start/server');

        setResponseStatus(error.statusCode);
      }

      throw error;
    }
  },
);

/** Rejects requests without a valid admin session. */
export const adminOnly = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const { isAdminRequest } = await import('./session');
    if (!isAdminRequest()) reject(403, 'Admin only');

    return next();
  },
);
