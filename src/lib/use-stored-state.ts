import { useEffect, useState } from 'react';

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

/** `useState` mirrored to localStorage; initial render stays stable, then saved values load and persist. */
export function useStoredState<T>(key: string, initial: T, codec: Codec<T>) {
  const [value, setValue] = useState(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      const saved = raw === null ? undefined : codec.parse(raw);
      if (saved !== undefined) setValue(saved);
    } catch {}

    setLoaded(true);
  }, [key, codec]);

  useEffect(() => {
    if (loaded) localStorage.setItem(key, codec.serialize(value));
  }, [key, codec, value, loaded]);

  return [value, setValue] as const;
}
