import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it, onTestFinished, vi } from 'vitest';

import { tempDir } from '@/test/helpers';
import { person as P } from '@/test/people';

import {
  Conflict,
  SCHEMA_VERSION,
  createStore,
  fileBackend,
  migrate,
  snapshotName,
} from './store';

import type { Backend, FamilyDoc } from './store';

const seed = [P('a', 'male', 1900)];
const NOW = new Date('2026-10-02T03:04:05.678Z');

/** A store over an in-memory backend whose writes can be made to fail. */
function memoryStore(
  options: { conflicts?: number; failSnapshots?: boolean } = {},
) {
  const state = {
    saved: undefined as FamilyDoc | undefined,
    version: 0,
    snapshots: [] as string[],
    /** Writes left to reject with a conflict, as if another server wrote first. */
    conflicts: 0,
    failSnapshots: false,
    ...options,
  };

  const backend: Backend = {
    read: async () =>
      state.saved && {
        doc: structuredClone(state.saved),
        version: String(state.version),
      },
    write: async (doc, version) => {
      if (state.conflicts > 0) {
        state.conflicts--;
        state.version++;
        throw new Conflict();
      }

      expect(version).toBe(state.saved ? String(state.version) : undefined);
      state.saved = structuredClone(doc);
      state.version++;
    },
    snapshot: async (_, name) => {
      if (state.failSnapshots) throw new Error('disk full');
      state.snapshots.push(name);
    },
  };

  return { state, store: createStore(backend, seed, () => NOW) };
}

describe('createStore', () => {
  it('reads the seed until the first write, then saves it with the change', async () => {
    const { state, store } = memoryStore();

    expect((await store.read()).people).toEqual(seed);
    expect(state.saved).toBeUndefined();

    await store.update((doc) => doc.people.push(P('b', 'female')));
    expect(state.saved?.people.map((p) => p.id)).toEqual(['a', 'b']);
    expect(state.saved?.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('snapshots every write', async () => {
    const { state, store } = memoryStore();

    await store.update(() => {});
    await store.update(() => {});
    expect(state.snapshots).toEqual([snapshotName(NOW), snapshotName(NOW)]);
    expect(snapshotName(NOW)).toBe('family-2026-10-02T03-04-05-678Z.json');
  });

  it('keeps the write when the snapshot fails', async () => {
    const { state, store } = memoryStore({ failSnapshots: true });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    onTestFinished(() => log.mockRestore());

    await store.update((doc) => doc.people.push(P('b', 'female')));
    expect(log).toHaveBeenCalled();
    expect(state.saved?.people).toHaveLength(2);
  });

  it('re-applies the change on top of a concurrent write', async () => {
    const { state, store } = memoryStore({ conflicts: 2 });
    let runs = 0;

    await store.update((doc) => {
      runs++;
      doc.people.push(P('b', 'female'));
    });

    expect(runs).toBe(3);
    expect(state.saved?.people).toHaveLength(2);
  });

  it('gives up after repeated conflicts', async () => {
    const { store } = memoryStore({ conflicts: 99 });
    await expect(store.update(() => {})).rejects.toBeInstanceOf(Conflict);
  });

  it('passes on errors from the change and keeps working', async () => {
    const { store } = memoryStore();

    await expect(
      store.update(() => {
        throw new Error('bad input');
      }),
    ).rejects.toThrow('bad input');

    await expect(store.update(() => {})).resolves.toBeUndefined();
  });
});

describe('migrate', () => {
  it('upgrades a document saved before versions existed', () => {
    expect(migrate({ people: seed, suggestions: {} })).toEqual({
      schemaVersion: SCHEMA_VERSION,
      people: seed,
      suggestions: {},
    });
  });

  it('fills in missing parts', () => {
    expect(migrate({})).toEqual({
      schemaVersion: SCHEMA_VERSION,
      people: [],
      suggestions: {},
    });
  });

  it('refuses a document from a newer version', () => {
    expect(() => migrate({ schemaVersion: SCHEMA_VERSION + 1 })).toThrow();
  });
});

describe('fileBackend', () => {
  it('writes the document and its snapshots next to it', async () => {
    const dir = await tempDir();
    const file = join(dir, 'data', 'family.json');
    const store = createStore(fileBackend(file), seed, () => NOW);

    await store.update((doc) => doc.people.push(P('b', 'female')));

    const saved = JSON.parse(await readFile(file, 'utf8')) as FamilyDoc;
    expect(saved.people).toHaveLength(2);

    expect(await readdir(join(dir, 'data', 'history'))).toEqual([
      snapshotName(NOW),
    ]);

    expect((await store.read()).people).toHaveLength(2);
  });

  it('passes on read errors other than a missing file', async () => {
    const dir = await tempDir();
    // A directory where the file should be
    const store = createStore(fileBackend(dir), seed);
    await expect(store.read()).rejects.toThrow();
  });
});
