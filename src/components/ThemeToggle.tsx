import { Monitor, Moon, Sun } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useT } from '@/lib/i18n';
import { THEMES, useTheme } from '@/lib/theme';
import { btn } from '@/lib/utils';

import type { Theme } from '@/lib/theme';
import type { LucideIcon } from 'lucide-react';

const ICONS: Record<Theme, LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

/** Cycles light → dark → system; the icon shows the current choice. */
export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useT();
  const { theme, setTheme } = useTheme();
  const Icon = ICONS[theme];
  const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
  const label = `${t('theme')}: ${t(theme)}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => setTheme(next)}
          aria-label={label}
          className={`${btn} flex items-center px-2 ${className ?? ''}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
