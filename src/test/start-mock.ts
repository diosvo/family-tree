/*
 * Stand-in for `@tanstack/react-start` in unit tests: server functions and
 * middleware become plain async functions, so their code runs directly.
 * Aliased in vitest.config.ts.
 */

type Next = () => Promise<unknown>;
type Server = (ctx: { next: Next }) => Promise<unknown>;
type Middleware = { server: Server };

export function createMiddleware(_options?: unknown) {
  return { server: (server: Server): Middleware => ({ server }) };
}

/** Run a middleware made with `createMiddleware`, with `next` after it. */
export const runMiddleware = (middleware: unknown, next: Next) =>
  (middleware as Middleware).server({ next });

export function createServerFn(_options?: unknown) {
  let middleware: Middleware[] = [];
  let validate = (data: unknown) => data;

  const builder = {
    middleware(list: Middleware[]) {
      middleware = list;

      return builder;
    },
    validator(fn: (data: never) => unknown) {
      validate = fn as (data: unknown) => unknown;

      return builder;
    },
    /** Middleware first, then the validator, then the handler. */
    handler(fn: (ctx: { data: never }) => unknown) {
      return (options?: { data?: unknown }) => {
        const run = async (i: number): Promise<unknown> => {
          if (i < middleware.length) {
            return middleware[i].server({ next: () => run(i + 1) });
          }

          return fn({ data: validate(options?.data) as never });
        };

        return run(0);
      };
    },
  };

  return builder;
}
