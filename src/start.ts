import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from '@tanstack/react-start';

import { errorPageResponse } from './lib/error-page';
import { httpStatus } from './server/middleware';

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    console.error(error);

    return errorPageResponse();
  }
});

// Re-add CSRF protection when defining src/start.ts.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, csrfMiddleware],
  functionMiddleware: [httpStatus],
}));
