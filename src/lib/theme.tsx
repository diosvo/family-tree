import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export const THEMES: Theme[] = ['light', 'dark', 'system'];

const KEY = 'ft-theme';
const QUERY = '(prefers-color-scheme: dark)';

/**
 * Inline <head> script: applies `.dark` before first paint so a saved dark
 * preference does not flash light. Keep in sync with `applyTheme` below.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(KEY)});var d=t==='dark'||(t!=='light'&&matchMedia(${JSON.stringify(QUERY)}).matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`;

const isTheme = (v: unknown): v is Theme =>
  (THEMES as readonly unknown[]).includes(v);

const readStored = (): Theme => {
  try {
    const raw = localStorage.getItem(KEY);

    return isTheme(raw) ? raw : 'system';
  } catch {
    return 'system';
  }
};

const applyTheme = (theme: Theme) => {
  const dark =
    theme === 'dark' || (theme === 'system' && matchMedia(QUERY).matches);

  document.documentElement.classList.toggle('dark', dark);
};

type Ctx = {
  theme: Theme;
  setTheme: (t: Theme) => void;
};

const ThemeCtx = createContext<Ctx | null>(null);

/** Light / dark / system preference, persisted in localStorage and mirrored to the `.dark` class. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Start with 'system' on both server and client so hydration matches; the
  // saved choice loads in an effect (the head script already painted it).
  const [theme, setThemeState] = useState<Theme>('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setThemeState(readStored());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    applyTheme(theme);

    if (theme !== 'system') return;

    const mq = matchMedia(QUERY);
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);

    return () => mq.removeEventListener('change', onChange);
  }, [theme, loaded]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);

    try {
      localStorage.setItem(KEY, t);
    } catch {}
  }, []);

  const value = useMemo<Ctx>(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => {
  const c = useContext(ThemeCtx);
  if (!c) throw new Error('ThemeProvider missing');

  return c;
};
