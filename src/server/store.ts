import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { BlobError, BlobPreconditionFailedError, get, put } from '@vercel/blob';

import { seedPeople } from './seed-data';

import type { Person, Suggestion } from '@/lib/family-data';

/*
 * Everyone and every pending suggestion, kept together as one JSON document:
 *
 * - in a private Vercel Blob, `family.json`, when BLOB_STORE_ID or
 *   BLOB_READ_WRITE_TOKEN is set;
 * - otherwise in a file (DATA_FILE, default `.data/family.json`) for local
 *   development and the e2e tests.
 *
 * Until the first write, reads return the seed data.
 */

export type FamilyDoc = {
  /** In the order they were added. */
  people: Person[];
  /** Pending suggestions by id. */
  suggestions: Record<string, Suggestion>;
};

/** A saved document and its version; `version` is undefined before the first write. */
type Read = { doc: FamilyDoc; version?: string };

type Backend = {
  read: () => Promise<Read | undefined>;
  /** Throws `Conflict` when the stored version is no longer `version`. */
  write: (doc: FamilyDoc, version?: string) => Promise<void>;
};

class Conflict extends Error {}

const BLOB_PATH = 'family.json';

const blobBackend: Backend = {
  read: async () => {
    // Skip the CDN cache: a cached copy would bring back stale data on writes.
    const res = await get(BLOB_PATH, { access: 'private', useCache: false });
    if (res?.statusCode !== 200) return undefined;

    return {
      doc: (await new Response(res.stream).json()) as FamilyDoc,
      // `get` can return a weak ETag (W/"…"), which `put`'s ifMatch never
      // matches; without the prefix it is the blob's strong ETag.
      version: res.blob.etag.replace(/^W\//, ''),
    };
  },
  write: async (doc, version) => {
    try {
      await put(BLOB_PATH, JSON.stringify(doc), {
        access: 'private',
        contentType: 'application/json',
        addRandomSuffix: false,
        // Overwrite only the version that was read; create only if still absent.
        ...(version
          ? { allowOverwrite: true, ifMatch: version }
          : { allowOverwrite: false }),
      });
    } catch (error) {
      // Someone else wrote first (an "already exists" error has no own class).
      const lost =
        error instanceof BlobPreconditionFailedError ||
        (!version && error instanceof BlobError);

      throw lost ? new Conflict() : error;
    }
  },
};

/** Single process, and `update` runs writes one at a time: no conflicts here. */
function fileBackend(file: string): Backend {
  return {
    read: async () => {
      try {
        return { doc: JSON.parse(await readFile(file, 'utf8')) as FamilyDoc };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
        throw error;
      }
    },
    write: async (doc) => {
      await mkdir(dirname(file), { recursive: true });
      // Write then rename, so a reader never sees a half-written file.
      await writeFile(`${file}.tmp`, JSON.stringify(doc, null, 2));
      await rename(`${file}.tmp`, file);
    },
  };
}

const MAX_ATTEMPTS = 5;

function createStore(backend: Backend) {
  async function load(): Promise<Read> {
    return (
      (await backend.read()) ?? {
        doc: { people: structuredClone(seedPeople), suggestions: {} },
      }
    );
  }

  // Updates from this server instance run one at a time.
  let queue = Promise.resolve();

  /**
   * Apply `change` to the latest document and save it. If another instance
   * saved in between, start over from its version; `change` may therefore run
   * more than once, and whatever it throws is passed on.
   */
  function update(change: (doc: FamilyDoc) => void) {
    const run = queue.then(async () => {
      for (let attempt = 1; ; attempt++) {
        const { doc, version } = await load();
        change(doc);

        try {
          return await backend.write(doc, version);
        } catch (error) {
          if (!(error instanceof Conflict) || attempt === MAX_ATTEMPTS) {
            throw error;
          }
        }
      }
    });

    queue = run.catch(() => {});

    return run;
  }

  return { read: async () => (await load()).doc, update };
}

let instance: ReturnType<typeof createStore> | undefined;

function connect() {
  const env = process.env;
  // A connected store sets BLOB_STORE_ID (the SDK then signs in with the
  // deployment's OIDC token); older connections set BLOB_READ_WRITE_TOKEN.
  if (env.BLOB_STORE_ID || env.BLOB_READ_WRITE_TOKEN) {
    return createStore(blobBackend);
  }

  // A deployment's file system is read-only and reset on every deploy.
  if (env.VERCEL) {
    throw new Error(
      'Vercel Blob is not configured: connect a Blob store to the project',
    );
  }

  return createStore(fileBackend(env.DATA_FILE || '.data/family.json'));
}

/** Picked on first use, so importing this module never needs the env to be set. */
export const store = () => (instance ??= connect());
