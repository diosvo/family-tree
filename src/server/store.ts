import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

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
 * Until the first write, reads return the seed data. Every write also saves a
 * snapshot under `history/` (next to the file locally), so a bad edit can be
 * undone by copying a snapshot back over `family.json`.
 */

/** Bump when the shape changes, and teach `migrate` the older shapes. */
export const SCHEMA_VERSION = 1;

export type FamilyDoc = {
  schemaVersion: typeof SCHEMA_VERSION;
  /** In the order they were added. */
  people: Person[];
  /** Pending suggestions by id. */
  suggestions: Record<string, Suggestion>;
};

/** A saved document and its version; `version` is undefined before the first write. */
type Read = { doc: FamilyDoc; version?: string };

export type Backend = {
  read: () => Promise<Read | undefined>;
  /** Throws `Conflict` when the stored version is no longer `version`. */
  write: (doc: FamilyDoc, version?: string) => Promise<void>;
  /** Keep a copy of a saved document under `name`. */
  snapshot: (doc: FamilyDoc, name: string) => Promise<void>;
};

export class Conflict extends Error {}

/** A stored document of any version, brought up to the current shape. */
export function migrate(raw: unknown): FamilyDoc {
  const doc = raw as Partial<FamilyDoc> & { schemaVersion?: number };

  // Version 0: the same shape without a version field.
  if ((doc.schemaVersion ?? 0) > SCHEMA_VERSION) {
    throw new Error(`Unknown family.json schema ${doc.schemaVersion}`);
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    people: doc.people ?? [],
    suggestions: doc.suggestions ?? {},
  };
}

/** Snapshot file name for a write at `date`, sortable by time. */
export const snapshotName = (date: Date) =>
  `family-${date.toISOString().replace(/[:.]/g, '-')}.json`;

const BLOB_PATH = 'family.json';

const blobBackend: Backend = {
  read: async () => {
    // Skip the CDN cache: a cached copy would bring back stale data on writes.
    const res = await get(BLOB_PATH, { access: 'private', useCache: false });
    if (res?.statusCode !== 200) return undefined;

    return {
      doc: migrate(await new Response(res.stream).json()),
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
  snapshot: async (doc, name) => {
    await put(`history/${name}`, JSON.stringify(doc), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
    });
  },
};

/** Single process, and `update` runs writes one at a time: no conflicts here. */
export function fileBackend(file: string): Backend {
  return {
    read: async () => {
      try {
        return { doc: migrate(JSON.parse(await readFile(file, 'utf8'))) };
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
    snapshot: async (doc, name) => {
      const dir = join(dirname(file), 'history');
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, name), JSON.stringify(doc, null, 2));
    },
  };
}

const MAX_ATTEMPTS = 5;

export function createStore(
  backend: Backend,
  seed: Person[] = seedPeople,
  now = () => new Date(),
) {
  async function load(): Promise<Read> {
    return (
      (await backend.read()) ?? {
        doc: {
          schemaVersion: SCHEMA_VERSION,
          people: structuredClone(seed),
          suggestions: {},
        },
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
          await backend.write(doc, version);
        } catch (error) {
          if (!(error instanceof Conflict) || attempt === MAX_ATTEMPTS) {
            throw error;
          }

          continue;
        }

        // The write already succeeded: a failed snapshot is only logged.
        await backend.snapshot(doc, snapshotName(now())).catch((error) => {
          console.error('Could not save a snapshot of family.json', error);
        });

        return;
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
