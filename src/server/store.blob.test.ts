import { join } from 'node:path';

import { BlobError, BlobPreconditionFailedError, get, put } from '@vercel/blob';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { tempDir } from '@/test/helpers';
import { person as P } from '@/test/people';

import type * as Blob from '@vercel/blob';

/*
 * The Vercel Blob backend and how a store is picked from the environment.
 * The SDK is mocked: these tests never reach the network.
 */

vi.mock('@vercel/blob', async (importOriginal) => ({
  ...(await importOriginal<typeof Blob>()),
  get: vi.fn(),
  put: vi.fn(),
}));

const getMock = vi.mocked(get);
const putMock = vi.mocked(put);

type GetResult = Awaited<ReturnType<typeof get>>;

/** What `put` resolves with; the store does not read it. */
const PUT_OK = {} as Awaited<ReturnType<typeof put>>;

/** A fresh copy of the module, so `store()` connects again. */
async function freshStore() {
  vi.resetModules();

  return import('./store');
}

/** What `get` returns for a saved document. */
function saved(doc: unknown, etag = 'W/"v1"') {
  return {
    statusCode: 200,
    stream: new Response(JSON.stringify(doc)).body,
    blob: { etag },
  } as unknown as GetResult;
}

beforeEach(() => {
  getMock.mockReset();
  putMock.mockReset();
  vi.stubEnv('BLOB_STORE_ID', '');
  vi.stubEnv('BLOB_READ_WRITE_TOKEN', '');
  vi.stubEnv('VERCEL', '');
  vi.stubEnv('DATA_FILE', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Blob backend', () => {
  beforeEach(() => vi.stubEnv('BLOB_STORE_ID', 'store_1'));

  it('reads the seed while the blob is missing or unreadable', async () => {
    const { store } = await freshStore();

    getMock.mockResolvedValueOnce(null);
    expect((await store().read()).people.length).toBeGreaterThan(0);

    getMock.mockResolvedValueOnce({ statusCode: 304 } as unknown as GetResult);

    expect((await store().read()).people.length).toBeGreaterThan(0);
  });

  it('reads the saved document, private and uncached', async () => {
    const { store } = await freshStore();
    getMock.mockResolvedValue(saved({ people: [P('a', 'male')] }));

    expect((await store().read()).people.map((p) => p.id)).toEqual(['a']);

    expect(getMock).toHaveBeenCalledWith('family.json', {
      access: 'private',
      useCache: false,
    });
  });

  it('overwrites only the version it read, by its strong ETag', async () => {
    const { store } = await freshStore();
    getMock.mockResolvedValue(saved({ people: [] }));
    putMock.mockResolvedValue(PUT_OK);

    await store().update((doc) => doc.people.push(P('a', 'male')));

    expect(putMock).toHaveBeenCalledWith(
      'family.json',
      expect.any(String),
      expect.objectContaining({ allowOverwrite: true, ifMatch: '"v1"' }),
    );

    // And a snapshot of what was saved
    expect(putMock.mock.calls[1]?.[0]).toMatch(/^history\/family-.*\.json$/);
  });

  it('creates the blob only if it is still absent', async () => {
    const { store } = await freshStore();
    getMock.mockResolvedValue(null);
    putMock.mockResolvedValue(PUT_OK);

    await store().update(() => {});

    expect(putMock).toHaveBeenCalledWith(
      'family.json',
      expect.any(String),
      expect.objectContaining({ allowOverwrite: false }),
    );
  });

  it('retries when someone else wrote first', async () => {
    const { store } = await freshStore();
    getMock.mockImplementation(async () => saved({ people: [] }));

    putMock
      .mockRejectedValueOnce(new BlobPreconditionFailedError())
      .mockResolvedValue(PUT_OK);

    let runs = 0;
    await store().update(() => void runs++);
    expect(runs).toBe(2);
  });

  it('retries when the blob was created in between', async () => {
    const { store } = await freshStore();
    getMock.mockResolvedValue(null);

    putMock
      .mockRejectedValueOnce(new BlobError('already exists'))
      .mockResolvedValue(PUT_OK);

    let runs = 0;
    await store().update(() => void runs++);
    expect(runs).toBe(2);
  });

  it('passes on other errors', async () => {
    const { store } = await freshStore();
    getMock.mockImplementation(async () => saved({ people: [] }));

    // A Blob error while overwriting is not a conflict
    putMock.mockRejectedValueOnce(new BlobError('suspended'));
    await expect(store().update(() => {})).rejects.toThrow('suspended');

    putMock.mockRejectedValueOnce(new Error('offline'));
    await expect(store().update(() => {})).rejects.toThrow('offline');
  });
});

describe('store()', () => {
  it('uses the Blob store with an old-style token too, and only connects once', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'token');
    const { store } = await freshStore();
    getMock.mockResolvedValue(null);

    expect(store()).toBe(store());
    await store().read();
    expect(getMock).toHaveBeenCalled();
  });

  it('refuses to run on Vercel without a Blob store', async () => {
    vi.stubEnv('VERCEL', '1');
    const { store } = await freshStore();
    expect(() => store()).toThrow('Vercel Blob is not configured');
  });

  it('uses a local file otherwise', async () => {
    vi.stubEnv('DATA_FILE', join(await tempDir(), 'family.json'));

    const { store } = await freshStore();
    await store().update((doc) => doc.people.splice(0));
    expect((await store().read()).people).toEqual([]);
    expect(getMock).not.toHaveBeenCalled();
  });

  it('defaults to .data/family.json', async () => {
    const { store } = await freshStore();
    // Reading only: the file may or may not exist in a checkout.
    await expect(store().read()).resolves.toHaveProperty('people');
  });
});
