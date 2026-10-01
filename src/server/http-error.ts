/*
 * Shared by server functions and their input validators. Validators also run
 * in the browser before a request is sent, so this module must stay free of
 * server-only imports; the HTTP status is applied by `httpStatus` in
 * src/server/middleware.ts.
 */

/** An error that reaches the client with its HTTP status. */
export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function reject(statusCode: number, message: string): never {
  throw new HttpError(statusCode, message);
}
