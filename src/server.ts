import { consumeLastCapturedError } from './lib/error-capture';
import { errorPageResponse } from './lib/error-page';

type ServerEntry = {
  fetch: (
    request: Request,
    env: unknown,
    ctx: unknown,
  ) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import('@tanstack/react-start/server-entry').then(
      (m) => {
        // Tolerate both a default export and a bare module namespace.
        const mod = m as unknown as { default?: ServerEntry };

        return mod.default ?? (m as unknown as ServerEntry);
      },
    );
  }

  return serverEntryPromise;
}

// h3 turns handler throws into a 500 JSON {"unhandled":true,"message":"HTTPError"};
// try/catch won't catch those.
async function normalizeCatastrophicSsrResponse(
  response: Response,
): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(
    consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`),
  );

  return errorPageResponse();
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as {
      unhandled?: unknown;
      message?: unknown;
    };

    return payload.unhandled === true && payload.message === 'HTTPError';
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);

      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);

      return errorPageResponse();
    }
  },
};
