import { useCallback, useMemo, useSyncExternalStore } from 'react';

/** How a value is written to and read back from localStorage. */
export type Codec<T> = {
  /** Turn a saved string into a value; return undefined to ignore it. */
  parse: (raw: string) => T | undefined;
  serialize: (value: T) => string;
};

/** JSON codec with a hook to migrate or validate what was saved. */
export const jsonCodec = <T>(revive: (data: unknown) => T): Codec<T> => ({
  parse: (raw) => revive(JSON.parse(raw)),
  serialize: (value) => JSON.stringify(value),
});

/** Codec for a string union: anything outside `values` is ignored. */
export const oneOf = <T extends string>(values: readonly T[]): Codec<T> => ({
  parse: (raw) =>
    (values as readonly string[]).includes(raw) ? (raw as T) : undefined,
  serialize: (value) => value,
});

/** Stand-in for localStorage when the browser refuses it (e.g. privacy modes). */
const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Other tabs changing the same key.
  window.addEventListener('storage', onChange);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

function read(key: string) {
  try {
    return localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

function write(key: string, raw: string) {
  try {
    localStorage.setItem(key, raw);
  } catch {
    memory.set(key, raw);
  }

  listeners.forEach((l) => l());
}

/**
 * A value kept in localStorage. The server and the hydrating render use
 * `initial`, so markup matches; the saved value follows right after, and
 * changes in other tabs are picked up too.
 */
export function useStoredState<T>(key: string, initial: T, codec: Codec<T>) {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );

  const value = useMemo(() => {
    if (raw === null) return initial;

    try {
      return codec.parse(raw) ?? initial;
    } catch {
      return initial;
    }
  }, [raw, codec, initial]);

  const setValue = useCallback(
    (next: T) => write(key, codec.serialize(next)),
    [key, codec],
  );

  return [value, setValue] as const;
}
