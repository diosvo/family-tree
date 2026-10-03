import { createContext, useContext, useEffect, useMemo } from 'react';

import { useHydrated } from '@tanstack/react-router';

import { oneOf, useStoredState } from './use-stored-state';

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

const themeCodec = oneOf(THEMES);

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
  // 'system' on the server and while hydrating, so markup matches; the head
  // script has already painted the saved choice.
  const [theme, setTheme] = useStoredState<Theme>(KEY, 'system', themeCodec);
  const hydrated = useHydrated();

  useEffect(() => {
    if (!hydrated) return;
    applyTheme(theme);

    if (theme !== 'system') return;

    const mq = matchMedia(QUERY);
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);

    return () => mq.removeEventListener('change', onChange);
  }, [theme, hydrated]);

  const value = useMemo<Ctx>(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => {
  const c = useContext(ThemeCtx);
  if (!c) throw new Error('ThemeProvider missing');

  return c;
};
